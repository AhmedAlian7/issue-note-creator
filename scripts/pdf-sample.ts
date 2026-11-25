import { closeChromium } from "../src/pdf/chromium";
import { mkdir, writeFile } from "node:fs/promises";
import { renderNotePdf } from "../src/pdf/render-note-pdf";
import { sample } from "./pdf-sample-data";
try {
  await mkdir("out", { recursive: true });
  await writeFile("out/sample-972.pdf", await renderNotePdf(sample));
} finally {
  await closeChromium();
}
