import { randomInt } from "node:crypto";
import { it, expect, vi, afterEach } from "vitest";
import { db } from "@/server/db";
import { currentUser } from "@/server/session";
import { groqExtractor, groqTranscriber } from "@/ai/groq";
import { POST } from "@/app/api/voice/parse/route";
import { aliasHandler } from "@/app/api/voice/alias-handler";
import { allowVoiceRequest } from "@/server/voice";
import { FakeTranscriber, FakeExtractor } from "@/ai/fakes";
vi.mock("@/server/session", () => ({ currentUser: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
const post = (data: object) =>
  new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
it("requires a session before processing input", async () => {
  vi.mocked(currentUser).mockResolvedValue(null);
  expect((await POST(post({ transcript: "hello" }))).status).toBe(401);
});
it("counts attempts per user and resets after a minute", () => {
  for (let i = 0; i < 10; i++)
    expect(allowVoiceRequest("limited", 0)).toBe(true);
  expect(allowVoiceRequest("limited", 59999)).toBe(false);
  expect(allowVoiceRequest("other", 59999)).toBe(true);
  expect(allowVoiceRequest("limited", 60000)).toBe(true);
});
it("uses active catalog rows, records the verified draft, and learns corrections once", async () => {
  const user = await db.user.create({
    data: {
      name: "tester",
      pinHash: "unused",
      phone: "07" + randomInt(100000000, 999999999),
      role: "KEEPER",
    },
  });
  const product = await db.product.create({ data: { nameAr: "كرسي تجريبي" } });
  const customer = await db.customer.create({
    data: { nameAr: "عميل تجريبي" },
  });
  const hidden = await db.product.create({
    data: { nameAr: "قديم", active: false },
  });
  try {
    vi.mocked(currentUser).mockResolvedValue(user);
    for (const [kind, row] of [
      ["product", product],
      ["customer", customer],
    ] as const) {
      const handler = aliasHandler(kind);
      const context = { params: Promise.resolve({ id: row.id }) };
      const responses = await Promise.all(
        ["الْمَكْتَبَة", "مكتبه"].map((alias) => handler(post({ alias }), context)),
      );
      for (const r of responses)
        expect(await r.json()).toEqual({ aliases: ["مكتبه"] });
    }
    const transcript = "عميل تجريبي كرسي تجريبي اتنين";
    const transcriber = new FakeTranscriber(transcript);
    vi.spyOn(groqTranscriber, "transcribe").mockImplementation(() =>
      transcriber.transcribe(),
    );
    const fake = new FakeExtractor(
      new Map([
        [
          transcript,
          {
            customerId: customer.id,
            customerText: customer.nameAr,
            lines: [
              {
                spokenText: product.nameAr,
                productId: product.id,
                quantity: null,
                quantityText: "اتنين",
                remarks: null,
                isDestination: false,
                confidence: 0.2,
              },
            ],
          },
        ],
      ]),
    );
    vi.spyOn(groqExtractor, "extract").mockImplementation(
      async (text, catalog) => {
        expect(catalog.products.map((p) => p.id)).not.toContain(hidden.id);
        expect(catalog.products).toContainEqual({
          id: product.id,
          nameAr: product.nameAr,
          aliases: ["مكتبه"],
        });
        return fake.extract(text);
      },
    );
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "audio/webm" },
        body: "fake",
      }),
    );
    expect(response.status).toBe(200);
    const { recordingId, draft } = await response.json();
    expect(draft.lines[0]).toMatchObject({
      productId: product.id,
      quantity: 2,
      confidence: 1,
      level: "GREEN",
    });
    expect(
      await db.recording.findUnique({ where: { id: recordingId } }),
    ).toMatchObject({ createdById: user.id, transcript, parsedJson: draft });
  } finally {
    await db.recording.deleteMany({ where: { createdById: user.id } });
    await db.auditLog.deleteMany({ where: { userId: user.id } });
    await db.product.deleteMany({
      where: { id: { in: [product.id, hidden.id] } },
    });
    await db.customer.delete({ where: { id: customer.id } });
    await db.user.delete({ where: { id: user.id } });
  }
});
