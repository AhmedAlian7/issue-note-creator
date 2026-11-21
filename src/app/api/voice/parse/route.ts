import { ar } from "@/lib/i18n";
import { currentUser } from "@/server/session";
import { allowed } from "@/server/permissions";
import { allowVoiceRequest, processVoice } from "@/server/voice";
import { InputFailure, voiceBody } from "@/server/voice-body";
export async function POST(request: Request) {
  const start = Date.now();
  let tokens = 0;
  try {
    const actor = await currentUser();
    if (!actor) return Response.json({ error: ar.login }, { status: 401 });
    if (!allowed(actor.role, "workspace"))
      return Response.json({ error: ar.denied }, { status: 403 });
    if (!allowVoiceRequest(actor.id))
      return Response.json({ error: ar.voice.limited }, { status: 429 });
    return Response.json(
      await processVoice(actor, await voiceBody(request), (n) => {
        tokens += n;
      }),
    );
  } catch (error) {
    if (error instanceof InputFailure)
      return Response.json(
        { error: error.status === 413 ? ar.voice.size : ar.invalid },
        { status: error.status },
      );
    return Response.json({ error: ar.voice.failed }, { status: 503 });
  } finally {
    console.info("voice.parse", { durationMs: Date.now() - start, tokens });
  }
}
