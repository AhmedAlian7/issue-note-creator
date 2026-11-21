import "dotenv/config";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { db, type Prisma } from "@/server/db";
import { allocateNumber } from "@/server/counter";

it("serializes 50 concurrent allocations and rolls back an abandoned number", async () => {
  const schema = "counter_" + randomUUID().replaceAll("-", "");
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  async function isolated<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    return db.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
        return work(tx);
      },
      { maxWait: 30000, timeout: 15000 },
    );
  }
  try {
    await isolated(async (tx) => {
      await tx.$executeRawUnsafe(
        'CREATE TABLE "Setting" (key text PRIMARY KEY, value jsonb)',
      );
      await tx.$executeRawUnsafe(
        'CREATE TABLE "NoteCounter" (id int PRIMARY KEY, "nextNumber" int)',
      );
      await tx.$executeRaw`INSERT INTO "NoteCounter" (id) VALUES (1)`;
      expect(await allocateNumber(tx)).toBe(973);
      await tx.$executeRaw`UPDATE "NoteCounter" SET "nextNumber"=NULL`;
      await tx.$executeRaw`INSERT INTO "Setting" VALUES ('numberingStart','1500')`;
    });
    await expect(
      isolated(async (tx) => {
        await allocateNumber(tx);
        throw Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    const numbers = await Promise.all(
      Array.from({ length: 50 }, () => isolated(allocateNumber)),
    );
    expect(numbers.sort((a, b) => a - b)).toEqual(
      Array.from({ length: 50 }, (_, i) => 1500 + i),
    );
  } finally {
    await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  }
}, 60000);
