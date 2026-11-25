import {
  extraction,
  transcriptInput,
  defaults,
  type Catalog,
  type Extractor,
  type Transcriber,
} from "./contracts";
import { match } from "./matching";
import { recoverQuantity } from "./quantity";
import { ar } from "@/lib/i18n";
export function verifyLine(
  line: import("./contracts").Extraction["lines"][number],
  transcript: string,
  catalog: Catalog,
  limits = defaults,
) {
  const { id: productId, ...verified } = match(
    line.spokenText,
    line.productId,
    catalog.products,
    limits,
  );
  // A model default of 1 can still hide a spoken quantity it missed.
  const quantity =
    line.quantity === 1 && !line.quantityText?.trim() ? null : line.quantity;
  return {
    spokenText: line.spokenText,
    productId,
    quantity:
      quantity ??
      recoverQuantity(transcript, line.spokenText, line.quantityText) ??
      1,
    remarks: line.remarks?.trim() ? line.remarks : ar.notes.defaultRemarks,
    ...verified,
  };
}
export async function parseVoice(
  input: string | Blob,
  catalog: Catalog,
  providers: { transcriber: Transcriber; extractor: Extractor },
  limits = defaults,
  usage?: (tokens: number) => void,
) {
  let text;
  if (typeof input === "string") text = input;
  else {
    const result = await providers.transcriber.transcribe(input, catalog);
    usage?.(result.tokens);
    text = result.text;
  }
  const transcript = transcriptInput.parse(text);
  const result = await providers.extractor.extract(transcript, catalog);
  usage?.(result.tokens);
  const raw = extraction.parse(result.draft);
  const { id: customerId, ...customer } = match(
    raw.customerText,
    raw.customerId,
    catalog.customers,
    limits,
  );
  const lines = raw.lines.map((line) => {
    return verifyLine(line, transcript, catalog, limits);
  });
  return {
    transcript,
    draft: {
      customer: { customerId, spokenText: raw.customerText, ...customer },
      lines,
    },
  };
}
export type VoiceResult = Awaited<ReturnType<typeof parseVoice>>;
