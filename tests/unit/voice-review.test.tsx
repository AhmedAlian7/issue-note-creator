import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MatchOptions } from "@/app/voice/match-options";
import { blockers, type Line, type Draft } from "@/app/voice/review-model";
import { ar } from "@/lib/i18n";
const base: Line = {
  key: "a",
  level: "GREEN",
  spokenText: "كرسي",
  quantity: 2,
  remarks: "",
  redRemark: false,
  productId: "p",
  candidates: [{ id: "p", nameAr: "اقتراح", score: 0.7 }],
};
const noop = () => {};
it.each(["GREEN", "YELLOW", "RED"] as const)(
  "renders %s with its next action",
  (level) => {
    const html = renderToStaticMarkup(
      <MatchOptions line={{ ...base, level }} choose={noop} create={noop} />,
    );
    expect(html).toContain(
      level === "GREEN"
        ? ar.flow.green
        : level === "YELLOW"
          ? ar.flow.yellow
          : ar.flow.red,
    );
    expect(html.includes("اقتراح")).toBe(level === "YELLOW");
    expect(html.includes(ar.voice.add)).toBe(level === "RED");
  },
);
const valid: Draft = { customerId: "c", lines: [base], transcript: "" };
it.each([
  [valid, ""],
  [{ ...valid, customerId: null }, ar.notes.choose],
  [{ ...valid, lines: [] }, ar.flow.needLine],
  [
    { ...valid, lines: [base, { ...base, level: "YELLOW" }] },
    ar.flow.needYellow,
  ],
  [
    { ...valid, lines: [{ ...base, level: "RED", productId: null }] },
    ar.flow.needRed,
  ],
  [{ ...valid, lines: [{ ...base, quantity: 0 }] }, ar.flow.qty],
] as [Draft, string][])(
  "explains each confirmation blocker",
  (draft, reason) => {
    expect(blockers(draft)).toBe(reason);
  },
);
