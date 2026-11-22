import { db } from "./db";
import { authorize, type Actor } from "./permissions";
import { defaults, thresholds, transcriptInput } from "@/ai/contracts";
import {
  fixtureProviders,
  fixtureEdits,
  fixtureSpeech,
} from "@/ai/fixture-provider";
import { FakeTranscriber } from "@/ai/fakes";

import type { EditContext } from "@/ai/edits";

import { parseVoice, verifyLine } from "@/ai/pipeline";
import { extractEdits, groqExtractor, groqTranscriber } from "@/ai/groq";

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
  const { catalog, limits } = await voiceCatalog();
  const providers =
    process.env.AI_PROVIDER === "fake"
      ? fixtureProviders(catalog)
      : { extractor: groqExtractor, transcriber: groqTranscriber };
  const result = await parseVoice(input, catalog, providers, limits, usage);
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

async function voiceCatalog() {
  const query = {
    where: { active: true },
    select: { id: true, nameAr: true, aliases: true },
  };
  const [products, customers, setting] = await Promise.all([
    db.product.findMany(query),
    db.customer.findMany(query),
    db.setting.findUnique({ where: { key: "voiceThresholds" } }),
  ]);
  return {
    catalog: { products, customers },
    limits: thresholds.parse(setting?.value ?? defaults),
  };
}

export async function processEdit(
  actor: Actor,
  current: EditContext,
  input: string | Blob,
) {
  authorize(actor, "note.create");
  const { catalog, limits } = await voiceCatalog();
  const fake = process.env.AI_PROVIDER === "fake";
  const transcriber = fake
    ? new FakeTranscriber(fixtureSpeech.edit)
    : groqTranscriber;
  const transcript = transcriptInput.parse(
    typeof input === "string"
      ? input
      : (await transcriber.transcribe(input, catalog)).text,
  );
  const { operations } = fake
    ? fixtureEdits(transcript, current)
    : (await extractEdits(transcript, current, catalog)).draft;
  const keys = new Set(current.lines.map((l) => l.key));
  const verified = operations.map((op) => {
    if (op.op === "addLine")
      return {
        op: op.op,
        line: verifyLine(op.line, transcript, catalog, limits),
      };
    if (op.op === "changeCustomer") {
      if (!catalog.customers.some((c) => c.id === op.customerId))
        throw Error("Unknown customer");
    } else if (!keys.has(op.key)) throw Error("Unknown line");
    else if (op.op === "removeLine") keys.delete(op.key);
    return op;
  });
  return { transcript, operations: verified };
}
