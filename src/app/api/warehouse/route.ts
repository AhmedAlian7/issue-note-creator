import { z } from "zod";
import { currentUser } from "@/server/session";
import { authorize, Denied } from "@/server/permissions";
import { catalogCommand, changeCatalog } from "@/server/catalog";
import { changeNote, createDraft, NoteConflict } from "@/server/notes";
import { id, noteInput, reasonInput } from "@/lib/inputs";
import { Prisma } from "@/generated/prisma/client";
import { ar } from "@/lib/i18n";

import { saveSetting, settingInput } from "@/server/settings";
const command = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setting"), setting: settingInput }),
  z.object({ action: z.literal("catalog"), command: catalogCommand }),
  z.object({ action: z.literal("create"), fields: noteInput }),
  z.object({ action: z.literal("edit"), id, fields: noteInput }),
  z.object({ action: z.literal("confirm"), id }),
  z.object({ action: z.literal("void"), id, reason: reasonInput }),
  z.object({
    action: z.literal("supersede"),
    id,
    fields: noteInput,
    reason: reasonInput,
  }),
]);
export async function POST(request: Request) {
  const actor = await currentUser();
  if (!actor) return Response.json({ error: ar.login }, { status: 401 });
  authorize(actor, "workspace");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: ar.invalid }, { status: 415 });
  const parsed = command.safeParse(await request.json().catch(() => null));
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
    if (c.action === "create" || c.action === "supersede")
      return Response.json(
        await createDraft(
          actor,
          c.fields,
          c.action === "supersede" ? { id: c.id, reason: c.reason } : undefined,
        ),
        { status: 201 },
      );
    return Response.json(
      await changeNote(
        actor,
        c.id,
        c.action === "edit"
          ? { kind: "edit", fields: c.fields }
          : c.action === "void"
            ? { kind: "void", reason: c.reason }
            : { kind: "confirm" },
      ),
    );
  } catch (err) {
    if (err instanceof Denied)
      return Response.json({ error: ar.denied }, { status: 403 });
    if (
      err instanceof NoteConflict ||
      (err instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2003", "P2025"].includes(err.code))
    )
      return Response.json({ error: ar.conflict }, { status: 409 });
    throw err;
  }
}
