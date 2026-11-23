import { daysIn, shift, type Range } from "./period";
type Item = { id: string; nameAr: string };
export type ReportNote = {
  id: string;
  number: number | null;
  date: Date;
  customer: Item;
  status: string;
  successor: { status: string } | null;
  lines: {
    product: Item;
    quantity: number;
    remarks: string | null;
  }[];
};
export type Bucket = { name: string; notes: number; units: number };
export function summarize(range: Range, rows: ReportNote[], catalog: Item[]) {
  const products = new Map<string, Bucket>(),
    customers = new Map<string, Bucket>(),
    remarks = new Map<string, Bucket>(),
    days = new Map<string, Bucket>();
  function bucket(map: Map<string, Bucket>, key: string, name: string) {
    let b = map.get(key);
    if (!b) {
      b = { name, notes: 0, units: 0 };
      map.set(key, b);
    }
    return b;
  }
  for (const p of catalog) bucket(products, p.id, p.nameAr);
  for (let i = 0; i < daysIn(range); i++) {
    const d = shift(range.from, i);
    bucket(days, d, d);
  }
  let units = 0;
  const notes = rows
    .filter(
      (n) =>
        n.status === "CONFIRMED" &&
        (!n.successor || n.successor.status === "DRAFT") &&
        days.has(n.date.toISOString().slice(0, 10)),
    )
    .map((n) => {
      const day = n.date.toISOString().slice(0, 10),
        daily = days.get(day)!,
        customer = bucket(customers, n.customer.id, n.customer.nameAr);
      daily.notes++;
      customer.notes++;
      let count = 0;
      const touched = new Set<Bucket>();
      for (const line of n.lines) {
        count += line.quantity;
        const groups = [bucket(products, line.product.id, line.product.nameAr)];
        const label = line.remarks?.trim() ?? "";
        groups.push(bucket(remarks, label, label));
        for (const group of groups) {
          group.units += line.quantity;
          touched.add(group);
        }
      }
      for (const group of touched) group.notes++;
      daily.units += count;
      customer.units += count;
      units += count;
      return {
        id: n.id,
        number: n.number,
        day,
        customer: n.customer.nameAr,
        units: count,
        lines: n.lines.map(({ product, quantity, remarks }) => ({
          name: product.nameAr,
          quantity,
          remarks,
        })),
      };
    });
  const ranked = (map: Map<string, Bucket>) =>
    Array.from(map.values()).sort(
      (a, b) => b.units - a.units || a.name.localeCompare(b.name, "ar"),
    );
  const byProduct = ranked(products);
  return {
    range,
    notes,
    units,
    total: notes.length,
    average: notes.length / days.size,
    days: [...days.values()],
    products: byProduct,
    top: byProduct.filter((p) => p.units > 0).slice(0, 10),
    slow: [...byProduct].reverse().slice(0, 10),
    customers: ranked(customers),
    remarks: ranked(remarks),
  };
}
