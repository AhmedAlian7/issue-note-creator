import type { Extraction, Extractor, Transcriber } from "./contracts";
export class FakeTranscriber implements Transcriber {
  constructor(private readonly text: string) {}
  async transcribe() {
    return { text: this.text, tokens: 0 };
  }
}
export class FakeExtractor implements Extractor {
  constructor(private readonly responses: ReadonlyMap<string, Extraction>) {}
  async extract(text: string) {
    const draft = this.responses.get(text);
    if (!draft) throw new Error("Unknown fixture transcript");
    return { draft: structuredClone(draft), tokens: 0 };
  }
}
