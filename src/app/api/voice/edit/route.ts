import { apiRoute } from "@/server/http";
import { z } from "zod";
import { editContext } from "@/ai/edits";
import { audioLimit, transcriptInput } from "@/ai/contracts";
import { ar } from "@/lib/i18n";
import { currentUser } from "@/server/session";
import { allowed } from "@/server/permissions";
import { allowVoiceRequest, processEdit } from "@/server/voice";
import { boundedBlob, InputFailure } from "@/server/voice-body";

export const POST = apiRoute("voice.edit", async (request: Request) => {
  const actor = await currentUser();
  if (!actor) return Response.json({ error: ar.login }, { status: 401 });
  if (!allowed(actor.role, "note.create"))
    return Response.json({ error: ar.denied }, { status: 403 });
  if (!allowVoiceRequest(actor.id))
    return Response.json({ error: ar.voice.limited }, { status: 429 });
  try {
    const type = request.headers.get("content-type") ?? "";
    if (!type.startsWith("multipart/form-data;")) throw new InputFailure(415);
    const body = await boundedBlob(request, audioLimit + 1024 * 1024, type);
    const form = await new Response(body, { headers: { "Content-Type": type } })
      .formData()
      .catch(() => {
        throw new InputFailure(400);
      });
    const fields = Array.from(form.keys()).sort();
    if (fields.join(",") !== "current,input") throw new InputFailure(400);
    const current = editContext.parse(
      JSON.parse(
        z
          .string()
          .max(256 * 1024)
          .parse(form.get("current")),
      ),
    );
    const input = z
      .union([
        transcriptInput,
        z
          .instanceof(Blob)
          .refine(
            (b) =>
              b.size > 0 &&
              b.size <= audioLimit &&
              ["audio/webm", "audio/mp4"].includes(b.type.split(";")[0]),
          ),
      ])
      .parse(form.get("input"));
    return Response.json(await processEdit(actor, current, input));
  } catch (e) {
    const status =
      e instanceof InputFailure
        ? e.status
        : e instanceof SyntaxError || e instanceof z.ZodError
          ? 400
          : 503;
    return Response.json(
      { error: status === 503 ? ar.voice.failed : ar.invalid },
      { status },
    );
  }
});
