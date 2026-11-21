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
export class MissingQuantity extends Error {
  constructor(
    readonly transcript: string,
    readonly item: string,
  ) {
    super("Missing quantity");
  }
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
    const { id: productId, ...verified } = match(
      line.spokenText,
      line.productId,
      catalog.products,
      limits,
    );
    const quantity =
      line.quantity ??
      recoverQuantity(transcript, line.spokenText, line.quantityText);
    if (quantity === null)
      throw new MissingQuantity(transcript, line.spokenText);
    return {
      spokenText: line.spokenText,
      productId,
      quantity,
      remarks: line.remarks,
      isDestination: line.isDestination,
      ...verified,
    };
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
