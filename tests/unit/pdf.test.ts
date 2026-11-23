import { execFileSync } from "node:child_process";
import { expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { rendererName, renderNotePdf } from "../../src/pdf/render-note-pdf";
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

it("uses Cloudflare on Netlify even if Playwright is configured", () => {
  vi.stubEnv("PDF_RENDERER", "playwright");
  vi.stubEnv("SITE_ID", "test-site-id");
  vi.stubEnv("SITE_NAME", "test-site");
  try {
    expect(rendererName()).toBe("cloudflare");
    vi.stubEnv("SITE_ID", undefined);
    expect(rendererName()).toBe("playwright");
  } finally {
    vi.unstubAllEnvs();
  }
});

it.skipIf(!poppler).each(["Template", "Sample-972"] as const)(
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
