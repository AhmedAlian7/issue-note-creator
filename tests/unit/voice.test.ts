import { describe, it, expect, vi } from "vitest";
import { FakeExtractor, FakeTranscriber } from "@/ai/fakes";
import { normalize, match } from "@/ai/matching";
import { parseQuantity, recoverQuantity } from "@/ai/quantity";
import { parseVoice, verifyLine } from "@/ai/pipeline";
import { fixtures, catalog } from "../fixtures/voice/load";
import { voiceBody } from "@/server/voice-body";
import { audioLimit } from "@/ai/contracts";
describe("voice fixtures", () => {
  for (const { transcript, expected, extracted } of fixtures)
    it(transcript, async () => {
      const providers = {
        transcriber: new FakeTranscriber(transcript),
        extractor: new FakeExtractor(new Map([[transcript, extracted]])),
      };
      const spy = vi.spyOn(providers.transcriber, "transcribe");
      for (const input of [transcript, new Blob(["fake"])]) {
        const result = await parseVoice(input, catalog, providers);
        expect(result.transcript).toBe(transcript);
        expect(result.draft.customer.customerId).toBe(expected.customerId);
        expect(result.draft.lines).toMatchObject(expected.lines);
        for (const line of result.draft.lines) {
          expect(line.candidates).toHaveLength(3);
          expect(line.unmatched).toBe(line.productId === null);
        }
      }
      expect(spy).toHaveBeenCalledTimes(1);
    });
});
it("normalizes diacritics, articles, spaces and spelling", () => {
  expect(normalize(" الثُّنَائِيَّة الـسِيدنى ")).toBe(normalize("ثنائيه سيدني"));
  expect(normalize("آرائك")).toBe(normalize("ارائك"));
});
it("verifies ids, scores and inclusive configurable thresholds independently", () => {
  const entries = [{ id: "a", nameAr: "abcde", aliases: ["chair"] }];
  expect(match("Chair", "a", entries).level).toBe("GREEN");
  expect(match("abcxy", "a", entries)).toMatchObject({
    id: "a",
    level: "YELLOW",
    confidence: 0.6,
  });
  expect(match("abcdx", "a", entries, { green: 0.8, yellow: 0.4 }).level).toBe(
    "GREEN",
  );
  expect(match("z", "a", entries)).toMatchObject({
    id: null,
    level: "RED",
    unmatched: true,
  });
  expect(match("chair", "invented", entries).id).toBeNull();
  expect(match("chair", null, entries).id).toBeNull();
  expect(
    match("chair", "a", [...entries, { ...entries[0], id: "b" }]).level,
  ).toBe("YELLOW");
});
it("parses Egyptian words from one through fifty", () => {
  const ones = "واحد اتنين تلاتة اربعة خمسة ستة سبعة تمانية تسعة".split(" ");
  const first = [
    ...ones,
    ..."عشرة حداشر اتناشر تلتاشر اربعتاشر خمستاشر ستاشر سبعتاشر تمانطاشر تسعتاشر".split(
      " ",
    ),
  ];
  const all = [
    ...first,
    ...["عشرين", "تلاتين", "اربعين"].flatMap((t) => [
      t,
      ...ones.map((n) => n + " و" + t),
    ]),
    "خمسين",
  ];
  all.forEach((name, i) => expect(parseQuantity(name), name).toBe(i + 1));
  expect(parseQuantity("٤٩")).toBe(49);
  expect(parseQuantity("كرسي")).toBeNull();
  expect(
    recoverQuantity(
      "مينون تلاتة سيدني واحد وكرسي نوبل اتنين",
      "تلاتة سيدني",
      null,
    ),
  ).toBe(1);
  expect(
    recoverQuantity("تلاتة سيدني لفرع الجيزة", "تلاتة سيدني", null),
  ).toBeNull();
});
it("defaults spoken item names without quantities and preserves explicit details", () => {
  const transcript = "ثلاثية سيدني وثنائية سيدني";
  for (const spokenText of ["ثلاثية سيدني", "ثنائية سيدني"]) {
    const line = {
      spokenText,
      productId: null,
      quantity: null,
      quantityText: null,
      remarks: null,
      confidence: 1,
    };
    expect(verifyLine(line, transcript, catalog)).toMatchObject({
      quantity: 1,
      remarks: "استندر",
    });
    expect(verifyLine(line, spokenText + " واحد", catalog)).toMatchObject({
      quantity: 1,
      remarks: null,
    });
    expect(
      verifyLine(
        { ...line, remarks: "فندق كارما" },
        spokenText + " لفندق كارما",
        catalog,
      ),
    ).toMatchObject({
      quantity: 1,
      remarks: "فندق كارما",
    });
  }
});
it("bounds audio uploads with or without content-length", async () => {
  const request = (body: BodyInit, headers: Record<string, string> = {}) =>
    new Request("http://localhost", {
      method: "POST",
      body,
      headers: { "Content-Type": "audio/mp4", ...headers },
    });
  expect(await voiceBody(request("audio"))).toBeInstanceOf(Blob);
  await expect(
    voiceBody(request("audio", { "Content-Length": String(audioLimit + 1) })),
  ).rejects.toMatchObject({ status: 413 });
  await expect(
    voiceBody(request(new Uint8Array(audioLimit + 1))),
  ).rejects.toMatchObject({ status: 413 });
  await expect(voiceBody(request(""))).rejects.toMatchObject({ status: 400 });
});
