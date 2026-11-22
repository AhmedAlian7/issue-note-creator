import { randomUUID } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { defaultSchedule } from "@/lib/report-config";
import { summarize, type ReportNote } from "@/server/reports/aggregate";
import {
  preset,
  reportPeriod,
  previous,
  cron,
  scheduledDay,
} from "@/server/reports/period";
import { emailHtml } from "@/server/reports/email";
import { signedPdf, validPdf, lifetime } from "@/server/reports/links";
import { csv, workbook } from "@/server/reports/export";
import { deliverOnce } from "@/server/reports/delivery";
import { db } from "@/server/db";
const range = { from: "2026-02-01", to: "2026-02-02" },
  product = { id: "p", nameAr: "كرسي" },
  customer = { id: "c", nameAr: "<عميل>" };
const note: ReportNote = {
  id: "a",
  date: new Date(range.from),
  number: 101,
  customer,
  status: "CONFIRMED",
  successor: null,
  lines: [2, 3].map((quantity) => ({
    quantity,
    product,
    remarks: "القاهرة",
    isDestination: true,
  })),
};
const catalog = [product, { id: "p2", nameAr: "مكتب" }];
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
it("counts current issued versions and distinct notes in each group, including zero days and idle products", () => {
  const r = summarize(
    range,
    [
      note,
      { ...note, successor: { status: "VOIDED" } },
      { ...note, successor: { status: "CONFIRMED" } },
      { ...note, status: "VOIDED" },
      { ...note, status: "DRAFT" },
      { ...note, date: new Date("2026-01-31") },
      { ...note, id: "b", successor: { status: "DRAFT" } },
    ],
    catalog,
  );
  expect([r.total, r.units, r.average]).toEqual([2, 10, 1]);
  for (const group of [r.days, r.top, r.customers, r.remarks, r.destinations])
    expect(group[0]).toMatchObject({ notes: 2, units: 10 });
  expect(r.days[1].units).toBe(0);
  expect(r.slow[0]).toMatchObject({ name: "مكتب", units: 0 });
  expect(summarize(range, [], catalog)).toMatchObject({
    total: 0,
    units: 0,
    average: 0,
    top: [],
  });
  expect(previous(range)).toEqual({ from: "2026-01-30", to: "2026-01-31" });
});
it("schedules by Cairo civil dates including month rollover, delayed jobs and summer time", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-31T21:30:00Z"));
  expect(preset("today").from).toBe("2026-08-01");
  expect(reportPeriod("monthly")).toEqual({
    from: "2026-07-01",
    to: "2026-07-31",
  });
  expect(cron("daily", defaultSchedule)).toBe("0 22 * * *");
  expect(cron("weekly", defaultSchedule)).toBe("0 5 * * 4");
  expect(cron("monthly", defaultSchedule)).toBe("0 9 1 * *");
  expect(scheduledDay("daily", defaultSchedule, new Date())).toBe("2026-07-31");
  expect(scheduledDay("monthly", defaultSchedule, new Date())).toBe(
    "2026-07-01",
  );
  expect(scheduledDay("weekly", defaultSchedule, new Date())).toBe(
    "2026-07-30",
  );
  expect(reportPeriod("weekly")).toEqual({
    from: "2026-07-25",
    to: "2026-07-31",
  });
});
it("binds signed links to the PDF and expires them at seven days", () => {
  vi.stubEnv("SESSION_SECRET", "unit secret");
  const now = new Date("2026-02-01T00:00Z");
  const url = new URL(signedPdf("a", now), "http://example.test"),
    exp = Number(url.searchParams.get("expires")),
    sig = url.searchParams.get("token")!;
  expect(validPdf("a", exp, sig, now)).toBe(true);
  expect(validPdf("b", exp, sig, now)).toBe(false);
  expect(validPdf("a", exp, sig, new Date(+now + lifetime * 1000))).toBe(false);
});
it.each(["daily", "weekly", "monthly"] as const)(
  "renders %s RTL email and export",
  async (type) => {
    vi.stubEnv("SESSION_SECRET", "unit secret");
    const r = {
      ...summarize(range, [note], catalog),
      previous: { range: previous(range), total: 0, units: 0 },
      delta: { total: 1, units: 5 },
    };
    expect(
      emailHtml(type, r, "https://example.test", new Date(range.from)),
    ).toMatchSnapshot();
    expect(csv(r)).toContain("<عميل>");
    expect((await workbook(r)).subarray(0, 2).toString()).toBe("PK");
  },
);
it("claims a period once across concurrent workers and redelivery, retries definite rejection, preserves unknown outcomes", async () => {
  const key = { type: "daily" as const, period: randomUUID() },
    send = vi.fn(async () => {});
  const run = () => deliverOnce(key, async () => send);
  send.mockRejectedValueOnce(
    Object.assign(Error("rejected"), { responseCode: 450 }),
  );
  await expect(run()).rejects.toThrow();
  await Promise.all([run(), run()]);
  await run();
  expect(send).toHaveBeenCalledTimes(2);
  expect(
    (await db.reportLog.findUniqueOrThrow({ where: { type_period: key } }))
      .status,
  ).toBe("sent");
  const unknown = { ...key, period: randomUUID() },
    lost = vi.fn(async () => {
      throw Error("connection lost");
    });
  await expect(deliverOnce(unknown, async () => lost)).rejects.toThrow();
  await deliverOnce(unknown, async () => lost);
  expect(lost).toHaveBeenCalledTimes(1);
});
