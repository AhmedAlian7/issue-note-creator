import { PDFDocument } from "pdf-lib";
import { noteTemplate, paper, type NoteData } from "./note-template";

export type PdfRenderer = "playwright" | "cloudflare";

export function rendererName(): PdfRenderer {
  const value = process.env.PDF_RENDERER || "playwright";
  if (value === "playwright" || value === "cloudflare") return value;
  throw new Error("Unsupported PDF_RENDERER: " + value);
}

async function playwrightPdf(html: string): Promise<Uint8Array> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate("window.printImagesReady");
    return await page.pdf({ preferCSSPageSize: true, printBackground: true });
  } finally {
    await browser.close();
  }
}

// Cloudflare Browser Run keeps Chromium out of the serverless bundle. The free
// Workers plan includes ten browser minutes per day.
async function cloudflarePdf(html: string): Promise<Uint8Array> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) throw new Error("Missing Cloudflare Browser Run credentials");
  const response = await fetch(
    "https://api.cloudflare.com/client/v4/accounts/" +
      encodeURIComponent(account) +
      "/browser-run/pdf",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html,
        waitForTimeout: 1500,
        gotoOptions: { waitUntil: "load", timeout: 45000 },
        pdfOptions: {
          preferCSSPageSize: true,
          printBackground: true,
          timeout: 60000,
        },
      }),
      signal: AbortSignal.timeout(90000),
    },
  );
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(
      "Cloudflare PDF failed (" + response.status + "): " + detail,
    );
  }
  if (!response.headers.get("content-type")?.includes("application/pdf")) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error("Cloudflare PDF returned a non-PDF response: " + detail);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function renderNotePdf(data: NoteData | null): Promise<Buffer> {
  const html = noteTemplate(data);
  const raw =
    rendererName() === "cloudflare"
      ? await cloudflarePdf(html)
      : await playwrightPdf(html);
  const pdf = await PDFDocument.load(raw);
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
}
