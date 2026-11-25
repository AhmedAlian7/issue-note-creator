import { boundedJson, apiRoute } from "@/server/http";
import { z } from "zod";
import { currentUser } from "@/server/session";
import { allowed, Denied } from "@/server/permissions";
import { catalogCommand, changeCatalog, MissingPin } from "@/server/catalog";
import {
  updateDraft,
  confirmNote,
  voidNote,
  supersedeNote,
  duplicateNote,
  createDraft,
  NoteConflict,
} from "@/server/notes";
import {
  draftTimestamp,
  id,
  noteInput,
  noteNumber,
  reasonInput,
} from "@/lib/inputs";
import { NoteNumberTaken } from "@/server/counter";
import { Prisma } from "@/generated/prisma/client";
import { ar } from "@/lib/i18n";
import { hasPdf } from "@/server/pdf-storage";

import { saveSetting, settingInput } from "@/server/settings";
const command = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("setting"), setting: settingInput }),
  z.strictObject({ action: z.literal("catalog"), command: catalogCommand }),
  z.strictObject({ action: z.literal("create"), fields: noteInput }),
  z.strictObject({
    action: z.literal("edit"),
    id,
    fields: noteInput,
    expected: draftTimestamp,
  }),
  z.strictObject({
    action: z.literal("confirm"),
    id,
    expected: draftTimestamp,
    number: noteNumber.optional(),
  }),
  z.strictObject({ action: z.literal("duplicate"), id }),
  z.strictObject({ action: z.literal("void"), id, reason: reasonInput }),
  z.strictObject({
    action: z.literal("supersede"),
    id,
    fields: noteInput,
    reason: reasonInput,
  }),
]);
export const POST = apiRoute("warehouse", async (request: Request) => {
  const actor = await currentUser();
  if (!actor) return Response.json({ error: ar.login }, { status: 401 });
  if (!allowed(actor.role, "workspace"))
    return Response.json({ error: ar.denied }, { status: 403 });
  const parsed = command.safeParse(await boundedJson(request, 512 * 1024));
  if (!parsed.success)
    return Response.json({ error: ar.invalid }, { status: 400 });
  const c = parsed.data;
  try {
    if (c.action === "setting") {
      await saveSetting(actor, c.setting);
      return new Response(null, { status: 204 });
    }
    if (c.action === "catalog")
      return Response.json({ id: await changeCatalog(actor, c.command) });
    const note = await (async () => {
      switch (c.action) {
        case "create":
          return createDraft(actor, c.fields);
        case "duplicate":
          return duplicateNote(actor, c.id);
        case "edit":
          return updateDraft(actor, c.id, c.fields, c.expected);
        case "confirm":
          return confirmNote(actor, c.id, c.expected, c.number);
        case "supersede":
          return supersedeNote(actor, c.id, c.fields, c.reason);
        case "void":
          return voidNote(actor, c.id, c.reason);
      }
    })();
    const { pdfPath, pdf, ...result } = note;
    return Response.json(
      { ...result, hasPdf: hasPdf({ pdfPath, pdf }) },
      {
        status: ["duplicate", "create", "supersede"].includes(c.action)
          ? 201
          : 200,
      },
    );
  } catch (err) {
    if (err instanceof MissingPin)
      return Response.json({ error: ar.errors.provisionPin }, { status: 400 });
    if (err instanceof Denied)
      return Response.json({ error: ar.denied }, { status: 403 });
    if (err instanceof NoteNumberTaken)
      return Response.json({ error: ar.notes.numberTaken }, { status: 409 });
    if (
      err instanceof NoteConflict ||
      (err instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2003", "P2025"].includes(err.code))
    )
      return Response.json({ error: ar.conflict }, { status: 409 });
    throw err;
  }
});
