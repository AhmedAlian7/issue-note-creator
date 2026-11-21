import { z } from "zod";

export type Entry = { id: string; nameAr: string; aliases: string[] };
export type Catalog = { products: Entry[]; customers: Entry[] };
const score = z.number().min(0).max(1);
const phrase = z.string().max(300);
export const extraction = z.strictObject({
  customerId: z.string().nullable(),
  customerText: phrase,
  lines: z
    .array(
      z.strictObject({
        spokenText: phrase.min(1),
        productId: z.string().nullable(),
        quantity: z.int().positive().max(2147483647).nullable(),
        quantityText: phrase.nullable(),
        remarks: phrase.nullable(),
        isDestination: z.boolean(),
        confidence: score,
      }),
    )
    .max(100),
});
export type Extraction = z.infer<typeof extraction>;
export const thresholds = z
  .object({ green: score, yellow: score })
  .refine((v) => v.green > v.yellow && v.yellow > 0);
export const defaults = { green: 0.85, yellow: 0.6 };
export const transcriptInput = z.string().trim().min(1).max(12000);
export interface Transcriber {
  transcribe(
    audio: Blob,
    catalog: Catalog,
  ): Promise<{ text: string; tokens: number }>;
}
export interface Extractor {
  extract(
    text: string,
    catalog: Catalog,
  ): Promise<{ draft: Extraction; tokens: number }>;
}
export const audioLimit = 10 * 1024 * 1024;
