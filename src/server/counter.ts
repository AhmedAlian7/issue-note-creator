import type { Prisma } from "./db";

// UPDATE takes a row lock until the enclosing confirmation transaction commits.
export async function allocateNumber(tx: Prisma.TransactionClient) {
  const [row] = await tx.$queryRaw<{ number: number }[]>`
 UPDATE "NoteCounter" SET "nextNumber" = COALESCE("nextNumber",
   (SELECT (value #>> '{}')::integer FROM "Setting" WHERE key = 'numberingStart'),973) + 1
 WHERE id = 1 RETURNING "nextNumber" - 1 AS number`;
  if (!row || row.number < 1) throw new Error("Invalid note counter");
  return row.number;
}
