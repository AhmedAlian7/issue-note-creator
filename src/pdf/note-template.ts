import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ar } from "../lib/i18n";
import { company, defaultCompany } from "../lib/report-config";

const date = z
  .string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/)
  .refine((value) => {
    const [day, month, year] = value.split("/").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  });
const fields = {
  company: company.optional(),
  customerName: z.string().trim().min(1),
  number: z.number().int().positive(),
  date,
  lines: z.array(
    z.object({
      productName: z.string().trim().min(1),
      quantity: z.number().int().positive(),
      remarks: z.string().nullish(),
      isDestination: z.boolean().default(false),
    }),
  ),
};
export const noteSchema = z.object(fields);
export type NoteData = z.input<typeof noteSchema>;
type Note = z.output<typeof noteSchema>;
const labels = ar.notePdf;
export const paper = { width: 595.32, height: 841.92 };
const ink = "#1a2a3a";
function escape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
const cache = new Map<string, string>();
function asset(file: string, type: string) {
  let url = cache.get(file);
  if (!url) {
    url =
      "data:" +
      type +
      ";base64," +
      readFileSync(join(process.cwd(), "src/pdf", file)).toString("base64");
    cache.set(file, url);
  }
  return url;
}
function font(family: string, file: string, weight = 400) {
  return `@font-face{font-family:'${family}';font-weight:${weight};src:url('${asset("fonts/" + file, "application/octet-stream")}')}`;
}
// SVG coordinates are PDF points from the top left. The text y coordinate is its baseline.
function textAt(
  x: number,
  y: number,
  size: number,
  content: string,
  attrs = "",
) {
  return `<text x="${x}" y="${y}" font-size="${size}" ${attrs}>${content}</text>`;
}
function box(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`;
}
const centers = [130.46, 296.99, 449.96, 545.02];
const centered = 'text-anchor="middle" direction="rtl"';
function itemTable(lines: Note["lines"], offset: number) {
  const left = 36,
    right = 559.18,
    top = 173.3,
    bottom = 631.3;
  const rules = [
    top,
    196.46,
    239.9,
    283.37,
    326.81,
    370.25,
    413.81,
    457.27,
    500.71,
    544.15,
    587.59,
    631.06,
  ];
  let svg = box(left, top, right - left, 23.16, "#475569");
  for (const y of rules) svg += box(left, y, right - left, 0.24, ink);
  for (const x of [left, 224.81, 368.83, 530.86, 558.94])
    svg += box(x, top, 0.24, bottom - top, ink);
  labels.headings.forEach((s, i) => {
    svg += textAt(centers[i], 188.9, 12, s, centered + ' fill="white"');
  });
  for (let i = 0; i < 10; i++) {
    const line = lines[offset + i];
    const baseline = rules[i + 1] + 27.12;
    if (line) {
      svg += textAt(
        centers[0],
        baseline,
        15.96,
        escape(line.remarks ?? ""),
        centered +
          ' data-fit="178.01"' +
          (line.isDestination ? ' fill="#ee0000"' : ""),
      );
      svg += textAt(
        centers[1],
        baseline,
        15.96,
        String(line.quantity),
        'text-anchor="middle"',
      );
      svg += textAt(
        centers[2],
        baseline,
        15.96,
        escape(line.productName),
        centered + ' data-fit="151.22"',
      );
    }
    svg += textAt(
      centers[3],
      baseline - 2.04,
      9.96,
      String(offset + i + 1).padStart(2, "0"),
      'text-anchor="middle"',
    );
  }
  return svg;
}
function sheet(note: Note | null, index: number, total: number) {
  const logo = asset("assets/logo.png", "image/png");
  const qr = asset("assets/QR.jpg", "image/jpeg");
  const customer = (note?.customerName ?? "")
    .split(/([A-Za-z]+(?: [A-Za-z]+)*)/)
    .map((part, i) =>
      i % 2
        ? `<tspan dx="-1.45" font-family="TimesBold" font-weight="bold">${escape(part)}</tspan>`
        : escape(part),
    )
    .join("");
  const meta = (x: number, label: string, value: string) =>
    textAt(
      x,
      135.5,
      15.96,
      `<tspan font-weight="bold">${label}</tspan>:${value ? " " + value : ""}`,
      'direction="rtl" fill="black" data-fit="178"',
    );
  const metadata =
    meta(
      219.65,
      labels.date,
      note
        ? `<tspan direction="ltr" unicode-bidi="embed">${note.date}</tspan>`
        : "",
    ) +
    meta(
      363.67,
      labels.number,
      note ? `<tspan fill="red">${note.number}</tspan>` : "",
    ) +
    meta(549.7, labels.customer, customer);
  const contact=note?.company;
  const custom=contact && (contact.website!==defaultCompany.website || contact.phone!==defaultCompany.phone || contact.city!==defaultCompany.city);
  const footer =
    textAt(
      36,
      801.24,
      11.04,
      '<tspan font-weight="bold">Thank you for choosing Italian Home Furniture.</tspan><tspan x="270.53">Visit our showroom or scan the QR code for more</tspan>',
    ) +
    textAt(36, 814.68, 11.04, "products.") +
    textAt(
      36,
      828.12,
      11.04,
      custom
        ? escape([contact.website,contact.phone,contact.city].join(" | "))
        : '<tspan font-weight="bold" fill="#467886">italianfurniture-eg.com</tspan><tspan x="154.70">| +20 101 347 8443 | Cairo, Egypt</tspan>',
      custom?'data-fit="480"':"",
    ) +
    (custom?"":box(36, 828.6, 116.42, 0.24, "#467886"));
  return `<section><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595.32 841.92" fill="${ink}" font-family="Hacen,CambriaNote">
  <image href="${logo}" x="115.40" y="350.85" width="364.45" height="137.95" opacity=".06"/>
  <image href="${logo}" x="251.24" y="13.44" width="91.82" height="37.79" preserveAspectRatio="none"/>
  ${textAt(298.1, 94.82, 26.04, labels.title, centered + ' textLength="135.3" lengthAdjust="spacingAndGlyphs"')}
  ${box(36, 115.82, 522.93, 0.48, "black")}${metadata}${box(35.28, 144.14, 523.65, 0.48, "black")}
  ${itemTable(note?.lines ?? [], index * 10)}
  ${textAt(298.1, 671.86, 11.04, labels.receipt, centered + ' fill="#808080" textLength="244.6" lengthAdjust="spacingAndGlyphs" transform="translate(223.93 0) skewX(-18.4349)"')}
  ${box(36, 686.98, 522.93, 0.48, "black")}
  ${labels.signatures.map((s, i) => textAt([183.65, 386.23, 553.53][i], 711.94, 14.04, s, 'direction="rtl" fill="black"')).join("")}
  ${box(35.28, 727.06, 523.65, 0.48, "black")}
  ${total > 1 ? textAt(297.65, 752, 10, labels.page(index + 1, total), centered) : ""}
  ${box(34.68, 773.736, 526.3, 0.72, "black")}<g font-family="Aptos" fill="black">${footer}</g>
  <image class="qr" x="514.4" y="781.717" width="48.05" height="48" preserveAspectRatio="none" href="${qr}"/>
  </svg></section>`;
}
export function noteTemplate(data: NoteData | null) {
  const note = data === null ? null : noteSchema.parse(data);
  const pages = Math.max(1, Math.ceil((note?.lines.length ?? 0) / 10));
  return `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><style>
    ${font("Hacen", "Hacen Tunisia.ttf")}${font("CambriaNote", "cambria.ttc")}${font("TimesBold", "timesbd.ttf", 700)}${font("Aptos", "Aptos-Regular.ttf")}${font("Aptos", "Aptos-Bold.ttf", 700)}
    text{text-rendering:geometricPrecision}@page{size:595.32pt 841.92pt;margin:0}*{margin:0;padding:0}body{direction:ltr}section{width:595.32pt;break-after:page;direction:ltr}section:last-child{break-after:auto}section>svg{display:block;width:100%;height:841.92pt}</style><body>${Array.from({ length: pages }, (_, i) => sheet(note, i, pages)).join("")}<script>
  // Word crops the supplied JPEG and samples the 48 pt print frame at 200 dpi.
  window.printImagesReady = (async () => {
    await document.fonts.ready;
    for (const text of document.querySelectorAll("text[data-fit]")) {
      const available = Number(text.dataset.fit);
      if (text.getComputedTextLength() > available) {
        text.setAttribute("lengthAdjust","spacingAndGlyphs");
        text.setAttribute("textLength",String(available));
      }
    }
    const images = document.querySelectorAll(".qr");
    const source = new Image(); source.src = images[0].getAttribute("href"); await source.decode();
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 133;
    const ctx = canvas.getContext("2d"); ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source,48,48,254,254,0,0,133,133);
    const url = canvas.toDataURL("image/jpeg",0.92);
    for (const image of images) image.setAttribute("href",url);
  })();
  </script></body></html>`;
}
