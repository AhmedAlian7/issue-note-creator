import { readdirSync, readFileSync } from "node:fs";
import { z } from "zod";
import { extraction } from "../../../src/ai/contracts";
export { default as catalog } from "./catalog.json";
const directory = new URL(".", import.meta.url);
const fixture = z.object({
  transcript: z.string(),
  extracted: extraction,
  expected: z.object({
    customerId: z.string().nullable(),
    lines: z.array(
      z.object({
        productId: z.string().nullable(),
        quantity: z.int(),
        remarks: z.string().nullable(),
      }),
    ),
  }),
});
export const fixtures = readdirSync(directory)
  .filter((name) => /^\d+\.json$/.test(name))
  .sort()
  .map((name) =>
    fixture.parse(JSON.parse(readFileSync(new URL(name, directory), "utf8"))),
  );
