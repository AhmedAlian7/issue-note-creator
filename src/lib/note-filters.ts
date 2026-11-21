import { z } from "zod";
import { id } from "./inputs";
export const filters = z
  .object({
    q: z.string().trim().max(180).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    productId: id.optional(),
    status: z.enum(["DRAFT", "CONFIRMED", "SUPERSEDED", "VOIDED"]).optional(),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to);
export function normalizeArabic(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\p{M}ـ]/gu, "")
    .replace(/ٱ/g, "ا")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .trim();
}
