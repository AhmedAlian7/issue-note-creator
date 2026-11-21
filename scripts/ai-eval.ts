import "dotenv/config";
import { fixtures, catalog } from "../tests/fixtures/voice/load";
import { openaiTranscriber, openaiExtractor } from "../src/ai/openai";
import { parseVoice } from "../src/ai/pipeline";
if (!process.env.OPENAI_API_KEY) {
  console.log("Skipped voice evaluation: OPENAI_API_KEY is unset.");
} else {
  let total = 0,
    correct = 0;
  for (const { transcript, expected } of fixtures) {
    try {
      const { draft } = await parseVoice(transcript, catalog, {
        extractor: openaiExtractor,
        transcriber: openaiTranscriber,
      });
      const count = Math.max(expected.lines.length, draft.lines.length);
      for (let i = 0; i < count; i++) {
        const want = expected.lines[i],
          actual = draft.lines[i];
        const ok =
          !!want &&
          !!actual &&
          actual.productId === want.productId &&
          actual.quantity === want.quantity &&
          actual.remarks === want.remarks &&
          actual.isDestination === want.isDestination;
        total++;
        if (ok) correct++;
        console.log(ok ? "PASS" : "FAIL", transcript, "line", i + 1);
      }
    } catch {
      total += expected.lines.length;
      console.error("Provider or validation failure:", transcript);
      process.exitCode = 1;
    }
  }
  console.log(
    `Per-line accuracy: ${correct}/${total} (${((100 * correct) / total).toFixed(1)}%)`,
  );
}
