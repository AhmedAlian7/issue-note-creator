import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
export type { Prisma } from "@/generated/prisma/client";

const globalDb = globalThis as typeof globalThis & {
  warehouseDb?: PrismaClient;
};
export const db =
  globalDb.warehouseDb ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 15_000,
      // Prisma can load sibling relations concurrently on one transaction connection.
      pipeline: true,
    }),
    // Starting a transaction can include waking the hosted database.
    transactionOptions: { maxWait: 20_000 },
  });
if (process.env.NODE_ENV !== "production") globalDb.warehouseDb = db;
