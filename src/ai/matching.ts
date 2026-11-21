import { defaults, type Entry } from "./contracts";

export function words(text: string) {
  return (
    text
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\p{M}ـ]/gu, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/[ىی]/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}
export function normalize(text: string) {
  return words(text)
    .map((w) => w.replace(/^ال/u, ""))
    .join("");
}
function similarity(a: string, b: string) {
  if (!a || !b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        next[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + Number(a[i - 1] !== b[j - 1]),
      );
    prev = next;
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length);
}
export function match(
  text: string,
  proposed: string | null,
  entries: Entry[],
  limits = defaults,
) {
  const spoken = normalize(text);
  const candidates = entries
    .map(({ id, nameAr, aliases }) => ({
      id,
      nameAr,
      score: Math.max(
        ...[nameAr, ...aliases].map((n) => similarity(spoken, normalize(n))),
      ),
    }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 3);
  const best = candidates[0];
  const confidence = best?.score ?? 0;
  const accepted =
    !!best &&
    proposed !== null &&
    entries.some((e) => e.id === proposed) &&
    confidence >= limits.yellow;
  const level = !accepted
    ? "RED"
    : confidence >= limits.green &&
        best.id === proposed &&
        candidates[1]?.score !== confidence
      ? "GREEN"
      : "YELLOW";
  return {
    id: accepted ? best.id : null,
    confidence,
    level,
    unmatched: !accepted,
    candidates,
  };
}
