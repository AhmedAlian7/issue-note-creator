import type { z } from "zod";
import { noteInput, reasonInput } from "@/lib/inputs";
import { db } from "./db";
import { allocateNumber } from "./counter";
import { audit } from "./audit";
import { authorize, Denied, type Actor } from "./permissions";
type Fields = z.infer<typeof noteInput>;
const lines = (fields: Fields) =>
  fields.lines.map((line, position) => ({ ...line, position }));
function today() {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.TZ || "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(date + "T00:00:00Z");
}
export async function createDraft(
  actor: Actor,
  fields: Fields,
  prior?: { id: string; reason: string },
) {
  authorize(actor, prior ? "note.supersede" : "note.create");
  return db.$transaction(async (tx) => {
    const previous = prior
      ? await tx.issueNote.findUniqueOrThrow({
          where: { id: prior.id, status: "CONFIRMED" },
        })
      : null;
    const note = await tx.issueNote.create({
      data: {
        customerId: fields.customerId,
        date: today(),
        createdById: actor.id,
        lines: { create: lines(fields) },
        version: (previous?.version ?? 0) + 1,
        supersedesId: previous?.id,
      },
      include: { lines: true },
    });
    await audit(
      tx,
      actor.id,
      prior ? "supersede" : "create",
      "IssueNote",
      note.id,
      undefined,
      { ...note, reason: prior?.reason },
    );
    return note;
  });
}
export async function changeNote(
  actor: Actor,
  id: string,
  change:
    | { kind: "edit"; fields: Fields }
    | { kind: "confirm" }
    | { kind: "void"; reason: string },
) {
  authorize(
    actor,
    change.kind === "void"
      ? "note.void"
      : change.kind === "edit"
        ? "note.edit"
        : "note.confirm",
  );
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "IssueNote" WHERE id=${id} FOR UPDATE`;
    const before = await tx.issueNote.findUniqueOrThrow({
      where: { id },
      include: { lines: true },
    });
    if (actor.role === "KEEPER" && before.createdById !== actor.id)
      throw new Denied();
    if (before.status !== (change.kind === "void" ? "CONFIRMED" : "DRAFT"))
      throw new NoteConflict();
    const data =
      change.kind === "void"
        ? {
            status: "VOIDED" as const,
            voidReason: reasonInput.parse(change.reason),
          }
        : change.kind === "confirm"
          ? {
              status: "CONFIRMED" as const,
              number: await allocateNumber(tx),
              date: today(),
            }
          : {
              customerId: change.fields.customerId,
              lines: { deleteMany: {}, create: lines(change.fields) },
            };
    const after = await tx.issueNote.update({
      where: { id },
      data,
      include: { lines: true },
    });
    await audit(tx, actor.id, change.kind, "IssueNote", id, before, after);
    return after;
  });
}
export class NoteConflict extends Error {}
