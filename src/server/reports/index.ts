import { db } from "../db";
import { previous, type Range } from "./period";
import { summarize } from "./aggregate";
export async function loadReport(range: Range, prior = previous(range)) {
  const item = { select: { id: true, nameAr: true } };
  const [rows, catalog] = await Promise.all([
    db.issueNote.findMany({
      where: {
        date: { gte: new Date(prior.from), lte: new Date(range.to) },
        status: "CONFIRMED",
        OR: [{ successor: null }, { successor: { status: "DRAFT" } }],
      },
      orderBy: [{ date: "asc" }, { number: "asc" }],
      select: {
        id: true,
        number: true,
        date: true,
        status: true,
        customer: item,
        successor: { select: { status: true } },
        lines: {
          orderBy: { position: "asc" },
          select: {
            product: item,
            remarks: true,
            quantity: true,
          },
        },
      },
    }),
    db.product.findMany({ where: { active: true }, ...item }),
  ]);
  const report = summarize(range, rows, catalog),
    last = summarize(prior, rows, []);
  return {
    ...report,
    previous: { range: prior, units: last.units, total: last.total },
    delta: {
      units: report.units - last.units,
      total: report.total - last.total,
    },
  };
}
export type Report = Awaited<ReturnType<typeof loadReport>>;
