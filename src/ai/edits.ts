import { z } from "zod";
import { extraction } from "./contracts";
import { id } from "@/lib/inputs";

export const editContext = z.object({
  customerId: id.nullable(),
  lines: z
    .array(
      z.object({
        key: id,
        productId: id.nullable(),
        spokenText: z.string().max(300),
        quantity: z.int().nonnegative().max(2147483647),
        remarks: z.string().max(300),
      }),
    )
    .max(500),
});
export type EditContext = z.infer<typeof editContext>;
export const edits = z.strictObject({
  operations: z
    .array(
      z.union([
        z.strictObject({
          op: z.literal("setQuantity"),
          key: z.string(),
          quantity: z.int().positive().max(2147483647),
        }),
        z.strictObject({ op: z.literal("removeLine"), key: z.string() }),
        z.strictObject({
          op: z.literal("changeCustomer"),
          customerId: z.string(),
        }),
        z.strictObject({
          op: z.literal("addLine"),
          line: extraction.shape.lines.element,
        }),
      ]),
    )
    .max(100),
});
