import { it, expect, vi, afterEach } from "vitest";
import { openaiTranscriber, openaiExtractor } from "@/ai/openai";
import { fixtures, catalog } from "../fixtures/voice/load";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("sends Arabic hints, retries a transient timeout once, and reads usage", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test");
  vi.stubEnv("TRANSCRIBE_MODEL", "test-transcriber");
  const fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(new DOMException("timeout", "TimeoutError"))
    .mockResolvedValueOnce(
      Response.json({ text: "كرسي نوبل", usage: { total_tokens: 17 } }),
    );
  vi.stubGlobal("fetch", fetcher);
  const result = await openaiTranscriber.transcribe(
    new Blob(["audio"], { type: "audio/mp4" }),
    catalog,
  );
  expect(result.tokens).toBe(17);
  expect(fetcher).toHaveBeenCalledTimes(2);
  const form = fetcher.mock.calls[1][1]?.body as FormData;
  expect(form.get("model")).toBe("test-transcriber");
  expect(form.get("language")).toBe("ar");
  for (const row of [...catalog.products, ...catalog.customers])
    expect(form.get("prompt")).toContain(row.nameAr);
  expect((form.get("file") as File).name).toBe("voice.mp4");
});
it("sends both full catalogs and rejects invalid structured output after one retry", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test");
  vi.stubEnv("PARSE_MODEL", "test-extractor");
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async () =>
      Response.json({ choices: [{ message: { content: "{}" } }] }),
    );
  vi.stubGlobal("fetch", fetcher);
  const { transcript } = fixtures[0];
  await expect(openaiExtractor.extract(transcript, catalog)).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(2);
  const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
  expect(JSON.parse(body.messages[1].content)).toEqual({
    transcript,
    ...catalog,
  });
  expect(body.response_format.json_schema.strict).toBe(true);
  expect(body.model).toBe("test-extractor");
});
