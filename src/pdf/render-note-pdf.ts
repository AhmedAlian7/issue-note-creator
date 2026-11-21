import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
import { noteTemplate, paper, type NoteData } from "./note-template";

export async function renderNotePdf(data: NoteData | null): Promise<Buffer> {
  const html = noteTemplate(data);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate("window.printImagesReady");
    const pdf = await PDFDocument.load(
      await page.pdf({ preferCSSPageSize: true, printBackground: true }),
    );
    // Chromium rounds the paper size to its print grid. Keep the original top-left origin.
    for (const sheet of pdf.getPages()) {
      sheet.setMediaBox(
        0,
        sheet.getHeight() - paper.height,
        paper.width,
        paper.height,
      );
    }
    return Buffer.from(await pdf.save());
  } finally {
    await browser.close();
  }
}
