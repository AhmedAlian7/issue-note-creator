import { ar } from "./i18n";

export function notePdfName(number: number | null, customerName: string) {
  const customer = customerName.replace(/[<>:"/\\|?*\p{Cc}]/gu, "-").trim();
  return `${ar.notePdf.filename} (${number ?? ""}) - ${customer}.pdf`;
}

export function notePdfDisposition(
  disposition: "inline" | "attachment",
  number: number | null,
  customerName: string,
) {
  const name = encodeURIComponent(notePdfName(number, customerName)).replace(
    /['()*]/g,
    (char) => "%" + char.charCodeAt(0).toString(16),
  );
  return `${disposition}; filename="note-${number ?? "draft"}.pdf"; filename*=UTF-8''${name}`;
}
