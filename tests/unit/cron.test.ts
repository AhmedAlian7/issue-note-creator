import { afterEach, expect, it, vi } from "vitest";
import { defaultSchedule } from "@/lib/report-config";
import { db } from "@/server/db";
import { authorizedCron } from "@/server/reports/cron-auth";
import { runDueReports } from "@/server/reports/schedule";

const sendMail = vi.hoisted(() => vi.fn(async () => ({ rejected: [] })));
vi.mock("@/server/reports/mailer", () => ({ sendMail }));

const periods = ["2026-11-20/2026-11-20", "2026-11-01/2026-11-02"];
afterEach(async () => {
  await db.reportLog.deleteMany({ where: { period: { in: periods } } });
  await db.setting.deleteMany({ where: { key: "reportSchedule" } });
  sendMail.mockClear();
  vi.unstubAllEnvs();
});

it("requires a matching bearer secret", () => {
  vi.stubEnv("CRON_SECRET", "cron-secret");
  expect(
    authorizedCron(new Headers({ authorization: "Bearer cron-secret" })),
  ).toBe(true);
  expect(
    authorizedCron(new Headers({ authorization: "Bearer wrong" })),
  ).toBe(false);
  expect(authorizedCron(new Headers())).toBe(false);
  vi.stubEnv("CRON_SECRET", "");
  expect(
    authorizedCron(new Headers({ authorization: "Bearer cron-secret" })),
  ).toBe(false);
});

it("sends each due period once and retries a stored failure with the same range", async () => {
  const schedule = {
    ...defaultSchedule,
    skipEmpty: false,
    daily: {
      ...defaultSchedule.daily,
      enabled: true,
      recipients: ["owner@example.test"],
    },
  };
  await db.setting.create({
    data: { key: "reportSchedule", value: schedule },
  });
  await db.reportLog.create({
    data: {
      type: "daily",
      period: periods[1],
      status: "failed",
      updatedAt: new Date("2026-11-01T00:00:00Z"),
    },
  });
  const now = new Date("2026-11-20T20:05:00Z");
  const first = await runDueReports(now);
  expect(first.find((row) => row.type === "daily")?.status).toBe("sent");
  expect(first.find((row) => row.period === periods[1])?.status).toBe("sent");
  expect(sendMail).toHaveBeenCalledTimes(2);
  const second = await runDueReports(now);
  expect(second.find((row) => row.type === "daily")?.status).toBe("skipped");
  expect(sendMail).toHaveBeenCalledTimes(2);
  const stored = await db.reportLog.findUniqueOrThrow({
    where: { type_period: { type: "daily", period: periods[1] } },
  });
  expect(stored.status).toBe("sent");
  expect(stored.sentAt).not.toBeNull();
});
