import { ar } from "@/lib/i18n";
import type { Frequency } from "@/lib/report-config";
import type { Report } from "./index";
const t = ar.reports;
const number = new Intl.NumberFormat("ar-EG", { useGrouping: false });
const date = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "long",
  timeZone: "UTC",
});
const escape = (s: string | number | null) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export function emailSubject(type: Frequency, { from, to }: Report["range"]) {
  return type === "daily"
    ? t.dailySubject + " — " + date.format(new Date(to))
    : t[type] + " · " + from + " — " + to;
}

export function emailHtml(type: Frequency, r: Report, base: string) {
  const start =
    '<div lang="ar" dir="rtl" style="direction:rtl;text-align:right;font:16px Arial,sans-serif;color:#17383e"><h1>';
  const ltr = (s: string) => '<span dir="ltr">' + escape(s) + "</span>";
  const name = (s: string) => '<bdi dir="auto">' + escape(s) + "</bdi>";
  const heading = (s: string) =>
    '<h2 style="font-size:18px;color:#155a65">' + s + "</h2>";
  function table(headers: string[], rows: string[][]) {
    return (
      '<table dir="rtl" style="direction:rtl;border-collapse:collapse;width:100%;text-align:right"><thead><tr>' +
      headers
        .map(
          (h) =>
            '<th scope="col" align="right" style="padding:8px;background:#e5eeee;text-align:right">' +
            escape(h) +
            "</th>",
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
                  '<td align="right" style="padding:8px;border-bottom:1px solid #ddd;text-align:right">' +
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
  if (type === "daily") {
    return (
      start +
      t.issuedToday +
      "</h1><p>" +
      t.total +
      " " +
      number.format(r.total) +
      "</p>" +
      (r.notes.length
        ? r.notes
            .map(
              (note) =>
                heading(
                  t.issuedNote +
                    " " +
                    (note.number === null ? "" : number.format(note.number)) +
                    " — " +
                    name(note.customer),
                ) +
                table(
                  [t.item, ar.notes.quantity, ar.notes.remarks],
                  note.lines.map((line) => [
                    name(line.name),
                    number.format(line.quantity),
                    name(line.remarks ?? ""),
                  ]),
                ),
            )
            .join("")
        : "<p>" + t.noNotesToday + "</p>") +
      "</div>"
    );
  }
  function ranking(name: string, rows: Report["top"]) {
    return (
      heading(escape(name)) +
      table(
        [t.rank, t.total, t.units],
        rows.map((b) => [escape(b.name), String(b.notes), String(b.units)]),
      )
    );
  }
  const busiest = r.days.reduce((a, b) => (a.notes >= b.notes ? a : b));
  const dash = new URL("/dashboard?" + new URLSearchParams(r.range), base);
  return (
    start +
    t[type] +
    "</h1><p>" +
    ltr(r.range.from + " — " + r.range.to) +
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
      ? "<p>" + t.busiest + " " + ltr(busiest.name) + "</p>"
      : "<p>" + t.none + "</p>") +
    heading(t.notes) +
    table(
      [ar.notePdf.number, ar.notePdf.date, ar.notes.customer, t.units],
      r.notes.map((n) => [
        escape(n.number),
        ltr(n.day),
        name(n.customer),
        String(n.units),
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
    "</a></p></div>"
  );
}
