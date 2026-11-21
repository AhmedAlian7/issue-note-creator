import { words } from "./matching";
const names = [
  "واحد واحدة واحده احد حادي",
  "اتنين اثنين اتنان اثنان تنين",
  "تلاتة تلات ثلاثة ثلاث",
  "اربعة اربع",
  "خمسة خمس",
  "ستة ست",
  "سبعة سبع",
  "تمانية تماني تمن ثمانية ثمان",
  "تسعة تسع",
  "عشرة عشر",
  "حداشر حداشره احدعشر",
  "اتناشر اتنعشر اثناعشر",
  "تلتاشر تلاتاشر",
  "اربعتاشر اربعةعشر",
  "خمستاشر",
  "ستاشر ستتاشر",
  "سبعتاشر",
  "تمنتاشر تمانتاشر تمانطاشر تمنطاشر",
  "تسعتاشر",
];
const values = new Map<string, number>();
for (const [i, variants] of names.entries())
  for (const word of words(variants)) values.set(word, i + 1);
const tens = new Map([
  ["عشرين", 20],
  ["تلاتين", 30],
  ["ثلاثين", 30],
  ["اربعين", 40],
  ["خمسين", 50],
]);
export function parseQuantity(text: string) {
  const tokens = words(text);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const value = values.get(token);
    if (value && value < 10) {
      const following = tokens[i + 1];
      const ten =
        following === "و"
          ? tens.get(tokens[i + 2])
          : following?.startsWith("و")
            ? tens.get(following.slice(1))
            : undefined;
      if (ten && ten + value <= 50) return ten + value;
    }
    if (value) return value;
    if (tens.has(token)) return tens.get(token)!;
    if (/^\d+$/.test(token) && +token > 0 && +token <= 2147483647)
      return +token;
  }
  return null;
}

// If the extractor omitted the separate quantity phrase, use only the number
// immediately following this item. Model names can themselves contain numbers.
export function recoverQuantity(
  transcript: string,
  spokenText: string,
  quantityText: string | null,
) {
  const explicit = parseQuantity(quantityText ?? "");
  if (explicit !== null) return explicit;
  const item = words(spokenText).join(" ");
  const speech = " " + words(transcript).join(" ") + " ";
  const needle = item + " ";
  const start = speech.indexOf(needle);
  if (!item || start < 0 || speech.indexOf(needle, start + needle.length) >= 0)
    return null;
  const tail = speech.slice(start + needle.length).split(" ", 3);
  if (parseQuantity(tail[0]) === null) return null;
  return parseQuantity(tail.join(" "));
}
