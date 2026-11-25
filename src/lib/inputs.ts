import { z } from "zod";
import { canColorRemark } from "./remarks";
const digits = (s: string) =>
  s.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632));
export const username = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[\p{L}\p{N}_.-]+$/u)
  .transform((value) => value.toLowerCase());
export const pin = z
  .string()
  .max(6)
  .transform(digits)
  .pipe(z.string().regex(/^\d{4,6}$/));
export const loginInput = z.strictObject({ username, pin });
export const id = z.uuid();
const name = z.string().trim().min(1).max(180);
const optionalText = z
  .string()
  .trim()
  .max(300)
  .nullish()
  .transform((v) => v || null);
const aliases = z.array(name).max(50);
export const productInput = z.strictObject({
  nameAr: name,
  aliases,
  category: optionalText,
});
export const customerInput = z.strictObject({
  nameAr: name,
  aliases,
  defaultDestination: optionalText,
  whatsappGroupName: optionalText,
});
export const userInput = z.strictObject({
  name,
  username,
  role: z.enum(["KEEPER", "ADMIN", "OWNER"]),
  pin: pin.optional(),
});
export const noteInput = z.strictObject({
  customerId: id,
  lines: z
    .array(
      z
        .strictObject({
          productId: id,
          quantity: z.int().positive().max(2147483647),
          remarks: optionalText,
          redRemark: z.boolean().default(false),
        })
        .transform((line) => ({
          ...line,
          redRemark: line.redRemark && canColorRemark(line.remarks),
        })),
    )
    .max(500),
});
export const reasonInput = z.string().trim().min(1).max(1000);
export const draftTimestamp = z.iso.datetime().optional();
export const noteNumber = z.int().positive().max(2147483647);
export const noteNumberText = z
  .string()
  .trim()
  .transform(digits)
  .pipe(z.string().regex(/^\d{1,10}$/))
  .transform(Number)
  .pipe(noteNumber);
