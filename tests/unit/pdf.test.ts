import { expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderNotePdf } from "../../src/pdf/render-note-pdf";
import { sample } from "../../scripts/pdf-sample-data";
import { compareNote } from "../../scripts/pdf-comparison";

it.each(["Template", "Sample-972"] as const)(
  "matches the Word export for %s",
  async (name) => {
    expect(await compareNote(name)).toBeLessThan(0.2);
  },
  60000,
);
it("continues a note across pages", async () => {
  const lines = Array.from({ length: 21 }, () => sample.lines[0]);
  const pdf = await PDFDocument.load(await renderNotePdf({ ...sample, lines }));
  expect(pdf.getPageCount()).toBe(3);
}, 60000);
