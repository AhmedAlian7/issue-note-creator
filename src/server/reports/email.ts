import { ar } from "@/lib/i18n";
import type { Frequency } from "@/lib/report-config";
import type { Report } from "./index";
import { signedPdf } from "./links";
const t = ar.reports;
const escape = (s: string | number | null) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export function emailHtml(
  type: Frequency,
  r: Report,
  base: string,
  now = new Date(),
) {
  const heading = (s: string) =>
    '<h2 style="font-size:18px;color:#155a65">' + escape(s) + "</h2>";
  function table(headers: string[], rows: string[][]) {
    return (
      '<table style="border-collapse:collapse;width:100%;text-align:right"><thead><tr>' +
      headers
        .map(
          (h) =>
            '<th style="padding:8px;background:#e5eeee">' + escape(h) + "</th>",
        )
        .join("") +
      "</tr></thead><tbody>" +
      rows
        .map(
          (row) =>
            "<tr>" +
            row
              .map(
                (c) =>
                  '<td style="padding:8px;border-bottom:1px solid #ddd">' +
                  c +
                  "</td>",
              )
              .join("") +
            "</tr>",
        )
        .join("") +
      "</tbody></table>"
    );
  }
  function ranking(name: string, rows: Report["top"]) {
    return (
      heading(name) +
      table(
        [t.rank, t.total, t.units],
        rows.map((b) => [escape(b.name), String(b.notes), String(b.units)]),
      )
    );
  }
  const busiest = r.days.reduce((a, b) => (a.notes >= b.notes ? a : b));
  const dash = new URL("/dashboard?" + new URLSearchParams(r.range), base);
  return (
    '<main lang="ar" dir="rtl" style="font:16px Arial,sans-serif;color:#17383e;text-align:right"><h1>' +
    t[type] +
    "</h1><p>" +
    r.range.from +
    " — " +
    r.range.to +
    "</p><p>" +
    t.total +
    " " +
    r.total +
    " · " +
    t.units +
    " " +
    r.units +
    "</p><p>" +
    t.comparison +
    " · " +
    t.total +
    " " +
    r.delta.total +
    " · " +
    t.units +
    " " +
    r.delta.units +
    "</p>" +
    (r.total
      ? "<p>" + t.busiest + " " + busiest.name + "</p>"
      : "<p>" + t.none + "</p>") +
    heading(t.notes) +
    table(
      [
        ar.notePdf.number,
        ar.notePdf.date,
        ar.notes.customer,
        t.units,
        ...(type === "daily" ? [t.download] : []),
      ],
      r.notes.map((n) => [
        escape(n.number),
        n.day,
        escape(n.customer),
        String(n.units),
        ...(type === "daily"
          ? [
              '<a href="' +
                escape(new URL(signedPdf(n.id, now), base).href) +
                '">' +
                ar.notes.download +
                "</a>",
            ]
          : []),
      ]),
    ) +
    ranking(t.top, r.top) +
    ranking(t.customers, r.customers) +
    (type === "monthly"
      ? ranking(t.slow, r.slow) + ranking(t.days, r.days)
      : "") +
    '<p><a style="display:inline-block;padding:14px;background:#155a65;color:white" href="' +
    escape(dash.href) +
    '">' +
    t.dashboard +
    "</a></p></main>"
  );
}
