import { z } from "zod";
import { zone, type Frequency, type Schedule } from "@/lib/report-config";
const dayMs = 86400000;
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: zone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export const cairoDay = (now = new Date()) => formatter.format(now);
export function shift(date: string, days: number) {
  return new Date(Date.parse(date) + days * dayMs).toISOString().slice(0, 10);
}
export const rangeSchema = z
  .object({ from: z.iso.date(), to: z.iso.date() })
  .refine(
    (r) =>
      r.from <= r.to && Date.parse(r.to) - Date.parse(r.from) <= 3660 * dayMs,
  );
export type Range = z.infer<typeof rangeSchema>;
export const daysIn = ({ from, to }: Range) =>
  (Date.parse(to) - Date.parse(from)) / dayMs + 1;
export function previous(r: Range) {
  const to=shift(r.from,-1);
  const month=r.from.endsWith("-01") && r.from.slice(0,7)===r.to.slice(0,7) && shift(r.to,1).endsWith("-01");
  return { from: month?to.slice(0,8)+"01":shift(r.from, -daysIn(r)), to };
}
export function preset(kind: "today" | "week" | "month", now = new Date()) {
  const to = cairoDay(now);
  const from =
    kind === "month"
      ? to.slice(0, 8) + "01"
      : kind === "week"
        ? shift(to, -((new Date(to).getUTCDay() + 1) % 7))
        : to;
  return { from, to };
}
export function reportPeriod(type: Frequency, now = new Date()): Range {
  const day = cairoDay(now);
  if (type === "daily") return { from: day, to: day };
  if (type === "weekly") return { from: shift(day, -7), to: shift(day, -1) };
  const to = shift(day.slice(0, 8) + "01", -1);
  return { from: to.slice(0, 8) + "01", to };
}
// A catch-up job may be created after midnight. Resolve its latest due local date.
export function scheduledDay(type: Frequency, s: Schedule, instant: Date) {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
  let day = cairoDay(instant);
  if (time < s[type].time) day = shift(day, -1);
  while (
    (type === "weekly" && new Date(day).getUTCDay() !== s.weekly.weekday) ||
    (type === "monthly" && Number(day.slice(-2)) !== s.monthly.monthday)
  )
    day = shift(day, -1);
  return day;
}
