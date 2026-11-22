import { FakeExtractor, FakeTranscriber } from "./fakes";
import type { Catalog, Extraction } from "./contracts";
import type { EditContext } from "./edits";

export const fixtureSpeech = {
  green: "مينون كرسي نوبل اتنين",
  yellow: "مينون كرسي نوبيلا اتنين",
  red: "مينون منضدة مرجان واحدة",
  edit: "غير كرسي نوبل لعشرين",
};
export function fixtureProviders(catalog: Catalog) {
  const customer = catalog.customers.find((c) => c.nameAr === "مينون");
  const chair = catalog.products.find((p) => p.nameAr === "كرسي نوبل");
  const responses = new Map<string, Extraction>();
  for (const [transcript, spokenText, productId, quantity] of [
    [fixtureSpeech.green, "كرسي نوبل", chair?.id ?? null, 2],
    [fixtureSpeech.yellow, "كرسي نوبيلا", chair?.id ?? null, 2],
    [fixtureSpeech.red, "منضدة مرجان", null, 1],
  ] as const) {
    responses.set(transcript, {
      customerId: customer?.id ?? null,
      customerText: "مينون",
      lines: [
        {
          spokenText,
          productId,
          quantity,
          quantityText: null,
          remarks: null,
          isDestination: false,
          confidence: 1,
        },
      ],
    });
  }
  return {
    transcriber: new FakeTranscriber(fixtureSpeech.green),
    extractor: new FakeExtractor(responses),
  };
}
export function fixtureEdits(transcript: string, current: EditContext) {
  const line = current.lines.find((l) => l.spokenText === "كرسي نوبل");
  return {
    operations:
      transcript === fixtureSpeech.edit && line
        ? [{ op: "setQuantity" as const, key: line.key, quantity: 20 }]
        : [],
  };
}
