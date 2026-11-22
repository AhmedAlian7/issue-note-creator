import type { VoiceResult } from "@/ai/pipeline";
import { ar } from "@/lib/i18n";
export type ParsedLine = VoiceResult["draft"]["lines"][number];
export type Line = Omit<ParsedLine, "level" | "remarks"> & {
  key: string;
  level: "RED" | "GREEN" | "YELLOW";
  remarks: string;
};
export type Draft = {
  customerId: string | null;
  lines: Line[];
  transcript: string;
};
export type Item = { id: string; nameAr: string; aliases?: string[] };
export function reviewLine(l: ParsedLine): Line {
  return {
    ...l,
    key: crypto.randomUUID(),
    level:
      l.level === "GREEN" ? "GREEN" : l.level === "YELLOW" ? "YELLOW" : "RED",
    remarks: l.remarks ?? "",
  };
}
export function fromSpeech(r: VoiceResult): Draft {
  return {
    customerId: r.draft.customer.customerId,
    lines: r.draft.lines.map(reviewLine),
    transcript: r.transcript,
  };
}
export function blockers(d: Draft) {
  const f = ar.flow;
  return [
    !d.customerId && ar.notes.choose,
    !d.lines.length && f.needLine,
    d.lines.length > 500 && f.tooMany,
    d.lines.some((l) => l.level === "RED" || !l.productId) && f.needRed,
    d.lines.some((l) => l.level === "YELLOW") && f.needYellow,
    d.lines.some(
      (l) =>
        !Number.isInteger(l.quantity) ||
        l.quantity < 1 ||
        l.quantity > 2147483647,
    ) && f.qty,
  ]
    .filter(Boolean)
    .join(" · ");
}
