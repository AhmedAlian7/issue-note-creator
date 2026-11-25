import type { Prisma } from "./db";

export class NoteNumberTaken extends Error {}

export async function allocateNumber(
  tx: Prisma.TransactionClient,
  requested?: number,
) {
  // Custom and automatic assignments share this lock through issuance.
  const [counter] = await tx.$queryRaw<{ number: number }[]>`
    SELECT COALESCE("nextNumber",
      (SELECT (value #>> '{}')::integer FROM "Setting" WHERE key = 'numberingStart'),
      973) AS number
    FROM "NoteCounter" WHERE id = 1 FOR UPDATE`;
  if (!counter || counter.number < 1) throw new Error("Invalid note counter");

  if (requested !== undefined) {
    const used = await tx.issueNote.findFirst({
      where: { number: requested },
      select: { id: true },
    });
    if (used) throw new NoteNumberTaken();
    return requested;
  }

  const [row] = await tx.$queryRaw<{ number: number }[]>`
    WITH RECURSIVE candidates(number) AS (
      SELECT ${counter.number}::integer
      UNION ALL
      SELECT candidate.number + 1
      FROM candidates AS candidate
      WHERE candidate.number < 2147483647
        AND EXISTS (SELECT 1 FROM "IssueNote" WHERE number = candidate.number)
    )
    UPDATE "NoteCounter" SET "nextNumber" = available.number + 1
    FROM (SELECT max(number) AS number FROM candidates) AS available
    WHERE id = 1 AND available.number < 2147483647
    RETURNING available.number`;
  if (!row) throw new Error("Note counter exhausted");
  return row.number;
}
