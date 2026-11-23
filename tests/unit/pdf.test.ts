import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderNotePdf } from "../../src/pdf/render-note-pdf";
import { sample } from "../../scripts/pdf-sample-data";
import { compareNote } from "../../scripts/pdf-comparison";

// The pixel comparison needs Poppler. CI installs it; a bare Windows machine
// still verifies page geometry with the structural test below.
const poppler = (() => {
  try {
    execFileSync("pdftoppm", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

it.skipIf(!poppler).each(["Template", "Sample-972"] as const)(
  "matches the Word export for %s",
  async (name) => {
    // The filled Word fixture colors one remark red. New PDFs use standard ink.
    expect(await compareNote(name)).toBeLessThan(
      name === "Sample-972" ? 0.23 : 0.2,
    );
  },
  60000,
);
it("continues a note across pages", async () => {
  const lines = Array.from({ length: 21 }, () => sample.lines[0]);
  const pdf = await PDFDocument.load(await renderNotePdf({ ...sample, lines }));
  expect(pdf.getPageCount()).toBe(3);
}, 60000);
