import { it, expect, vi, afterEach } from "vitest";
import {
  groqTranscriber,
  groqExtractor,
  ProviderQuotaExhausted,
} from "@/ai/groq";
import { fixtures, catalog } from "../fixtures/voice/load";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it.each(["credit_balance_exhausted", "insufficient_quota"])(
  "reports %s immediately for text and audio",
  async (code) => {
    vi.stubEnv("GROQ_API_KEY", "test");
    vi.stubEnv("PARSE_MODEL", "test");
    vi.stubEnv("TRANSCRIBE_MODEL", "test");
    const fetcher = vi.fn(async () =>
      Response.json({ error: { code } }, { status: 429 }),
    );
    vi.stubGlobal("fetch", fetcher);
    await expect(groqExtractor.extract("كرسي", catalog)).rejects.toBeInstanceOf(
      ProviderQuotaExhausted,
    );
    await expect(
      groqTranscriber.transcribe(new Blob(["test"]), catalog),
    ).rejects.toBeInstanceOf(ProviderQuotaExhausted);
    expect(fetcher).toHaveBeenCalledTimes(2);
  },
);
it("sends Arabic hints, retries a transient timeout once, and reads usage", async () => {
  vi.stubEnv("GROQ_API_KEY", "test");
  vi.stubEnv("TRANSCRIBE_MODEL", "test-transcriber");
  const fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(new DOMException("timeout", "TimeoutError"))
    .mockResolvedValueOnce(
      Response.json({ text: "كرسي نوبل", usage: { total_tokens: 17 } }),
    );
  vi.stubGlobal("fetch", fetcher);
  const result = await groqTranscriber.transcribe(
    new Blob(["audio"], { type: "audio/mp4" }),
    catalog,
  );
  expect(result.tokens).toBe(17);
  expect(fetcher).toHaveBeenCalledTimes(2);
  const form = fetcher.mock.calls[1][1]?.body as FormData;
  expect(fetcher.mock.calls[1][0]).toBe(
    "https://api.groq.com/openai/v1/audio/transcriptions",
  );
  expect(form.get("model")).toBe("test-transcriber");
  expect(form.get("language")).toBe("ar");
  for (const row of [...catalog.products, ...catalog.customers])
    expect(form.get("prompt")).toContain(row.nameAr);
  expect((form.get("file") as File).name).toBe("voice.mp4");
});
it("keeps customer and product names ahead of aliases within Groq's byte limit", async () => {
  vi.stubEnv("GROQ_API_KEY", "test");
  vi.stubEnv("TRANSCRIBE_MODEL", "test-transcriber");
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ text: "كرسي نوبل" }),
  );
  vi.stubGlobal("fetch", fetcher);
  const aliases = Array.from({ length: 50 }, (_, n) => `اسم بديل ${n}`);
  await groqTranscriber.transcribe(
    new Blob(["audio"], { type: "audio/webm" }),
    {
      customers: [{ id: "customer", nameAr: "عميل الاختبار", aliases }],
      products: [{ id: "product", nameAr: "كرسي نوبل", aliases: [] }],
    },
  );
  const form = fetcher.mock.calls[0][1]?.body as FormData;
  const prompt = String(form.get("prompt"));
  expect(prompt).toContain("عميل الاختبار، كرسي نوبل، اسم بديل 0");
  expect(prompt).not.toContain("اسم بديل 49");
  expect(Buffer.byteLength(prompt)).toBeLessThanOrEqual(896);
});
it("sends both full catalogs and rejects invalid structured output after one retry", async () => {
  vi.stubEnv("GROQ_API_KEY", "test");
  vi.stubEnv("PARSE_MODEL", "test-extractor");
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async () =>
      Response.json({ choices: [{ message: { content: "{}" } }] }),
    );
  vi.stubGlobal("fetch", fetcher);
  const { transcript } = fixtures[0];
  await expect(groqExtractor.extract(transcript, catalog)).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(2);
  const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
  expect(fetcher.mock.calls[0][0]).toBe(
    "https://api.groq.com/openai/v1/chat/completions",
  );
  expect(JSON.parse(body.messages[1].content)).toEqual({
    transcript,
    ...catalog,
  });
  expect(body.response_format.json_schema.strict).toBe(true);
  expect(body.model).toBe("test-extractor");
});
