import { log } from "@/server/log";
import { apiRoute } from "@/server/http";
import { id } from "@/lib/inputs";
import { ar } from "@/lib/i18n";
import { ProviderQuotaExhausted } from "@/ai/groq";
import { currentUser } from "@/server/session";
import { allowed } from "@/server/permissions";
import { allowVoiceRequest, processVoice } from "@/server/voice";
import { InputFailure, voiceBody } from "@/server/voice-body";
export const POST = apiRoute("voice.parse", async (request: Request) => {
  let tokens = 0;
  try {
    const actor = await currentUser();
    if (!actor) return Response.json({ error: ar.login }, { status: 401 });
    if (!allowed(actor.role, "workspace"))
      return Response.json({ error: ar.denied }, { status: 403 });
    const keeper = request.headers.get("x-draft-keeper");
    if (
      keeper !== null &&
      (!id.safeParse(keeper).success || keeper !== actor.id)
    )
      return Response.json({ error: ar.denied }, { status: 403 });
    const draftId = request.headers.get("x-draft-id");
    if (
      draftId !== null &&
      (keeper !== actor.id || !id.safeParse(draftId).success)
    )
      return Response.json({ error: ar.invalid }, { status: 400 });
    if (!allowVoiceRequest(actor.id))
      return Response.json({ error: ar.voice.limited }, { status: 429 });
    return Response.json(
      await processVoice(
        actor,
        await voiceBody(request),
        (n) => {
          tokens += n;
        },
        draftId ?? undefined,
      ),
    );
  } catch (error) {
    if (error instanceof ProviderQuotaExhausted)
      return Response.json({ error: ar.voice.quota }, { status: 503 });
    if (error instanceof InputFailure)
      return Response.json(
        { error: error.status === 413 ? ar.voice.size : ar.invalid },
        { status: error.status },
      );
    log.warn(
      { errorType: error instanceof Error ? error.name : "Unknown" },
      "Voice parse failed",
    );
    return Response.json({ error: ar.voice.failed }, { status: 503 });
  } finally {
    log.info({ tokens }, "Voice parse usage");
  }
});
