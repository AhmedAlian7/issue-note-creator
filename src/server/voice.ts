import { db } from "./db";
import { authorize, type Actor } from "./permissions";
import { defaults, thresholds } from "@/ai/contracts";
import { parseVoice } from "@/ai/pipeline";
import { openaiExtractor, openaiTranscriber } from "@/ai/openai";

// One fixed window per active account in the single application process.
const windows = new Map<string, { start: number; count: number }>();
export function allowVoiceRequest(userId: string, now = Date.now()) {
  for (const [id, window] of windows)
    if (now - window.start >= 60000) windows.delete(id);
  const window = windows.get(userId) ?? { start: now, count: 0 };
  windows.set(userId, window);
  return ++window.count <= 10;
}
export async function processVoice(
  actor: Actor,
  input: string | Blob,
  usage: (n: number) => void,
) {
  authorize(actor, "workspace");
  const query = {
    where: { active: true },
    select: { id: true, nameAr: true, aliases: true },
  };
  const [products, customers, setting] = await Promise.all([
    db.product.findMany(query),
    db.customer.findMany(query),
    db.setting.findUnique({ where: { key: "voiceThresholds" } }),
  ]);
  const result = await parseVoice(
    input,
    { products, customers },
    { extractor: openaiExtractor, transcriber: openaiTranscriber },
    thresholds.parse(setting?.value ?? defaults),
    usage,
  );
  const { id: recordingId } = await db.recording.create({
    data: {
      createdById: actor.id,
      transcript: result.transcript,
      parsedJson: result.draft,
    },
    select: { id: true },
  });
  return { ...result, recordingId };
}
