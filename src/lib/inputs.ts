import { z } from "zod";
const digits = (s: string) =>
  s.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632));
export const phone = z
  .string()
  .trim()
  .transform(digits)
  .pipe(z.string().regex(/^\+?[0-9]{7,15}$/));
export const pin = z
  .string()
  .transform(digits)
  .pipe(z.string().regex(/^\d{4,6}$/));
export const loginInput = z.object({ phone, pin });
export const id = z.uuid();
const name = z.string().trim().min(1).max(180);
const optionalText = z
  .string()
  .trim()
  .max(300)
  .nullish()
  .transform((v) => v || null);
const aliases = z.array(name).max(50);
export const productInput = z.object({
  nameAr: name,
  aliases,
  category: optionalText,
});
export const customerInput = z.object({
  nameAr: name,
  aliases,
  defaultDestination: optionalText,
  whatsappGroupName: optionalText,
});
export const userInput = z.object({
  name,
  phone,
  role: z.enum(["KEEPER", "ADMIN", "OWNER"]),
  pin: pin.optional(),
});
export const noteInput = z.object({
  customerId: id,
  lines: z
    .array(
      z.object({
        productId: id,
        quantity: z.int().positive().max(2147483647),
        remarks: optionalText,
        isDestination: z.boolean().optional(),
      }),
    )
    .max(500),
});
export const reasonInput = z.string().trim().min(1).max(1000);
export const draftTimestamp = z.iso.datetime().optional();
