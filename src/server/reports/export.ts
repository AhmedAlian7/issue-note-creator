import ExcelJS from "exceljs";
import { ar } from "@/lib/i18n";
import type { Report } from "./index";
const t = ar.reports;
function notes(r: Report) {
  return [
    [ar.notePdf.number, ar.notePdf.date, ar.notes.customer, t.units],
    ...r.notes.map((n) => [n.number, n.day, n.customer, n.units]),
  ];
}
export function csv(r: Report) {
  return (
    "\ufeff" +
    notes(r)
      .map((row) =>
        row
          .map((value) => {
            const s = String(value ?? "");
            return (
              '"' +
              (/^[\s]*[=+@-]|^[\t\r\n]/.test(s) ? "'" : "") +
              s.replaceAll('"', '""') +
              '"'
            );
          })
          .join(","),
      )
      .join("\r\n")
  );
}
export async function workbook(r: Report) {
  const book = new ExcelJS.Workbook();
  function sheet(name: string, rows: (string | number | null)[][]) {
    const ws = book.addWorksheet(name, { views: [{ rightToLeft: true }] });
    ws.addRows(rows);
    ws.getRow(1).font = { bold: true };
    ws.columns.forEach((c) => {
      c.width = 24;
    });
  }
  sheet(t.dashboard, [
    [ar.notes.from, ar.notes.to, t.total, t.units, t.average],
    [r.range.from, r.range.to, r.total, r.units, r.average],
    [
      r.previous.range.from,
      r.previous.range.to,
      r.previous.total,
      r.previous.units,
      null,
    ],
  ]);
  sheet(t.notes, notes(r));
  for (const [name, rows] of [
    [t.days, r.days],
    [ar.products, r.products],
    [t.customers, r.customers],
    [t.destinations, r.destinations],
    [ar.notes.remarks, r.remarks],
    [t.slow, r.slow],
  ] as const)
    sheet(name, [
      [t.rank, t.total, t.units],
      ...rows.map((b) => [b.name, b.notes, b.units]),
    ]);
  return Buffer.from(await book.xlsx.writeBuffer());
}
