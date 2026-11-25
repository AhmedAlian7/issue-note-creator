import { ar } from "@/lib/i18n";
import type { Frequency } from "@/lib/report-config";
import { db } from "../db";
import { getSchedule } from "../settings";
import { loadReport } from "./index";
import { emailHtml, emailSubject } from "./email";
import { workbook } from "./export";
import { reportPeriod, rangeSchema, type Range } from "./period";
import { sendMail } from "./mailer";
const t = ar.reports;
type Key = { type: Frequency; period: string };
export type DeliveryResult = "sent" | "skipped";

export function failedReports() {
  return db.reportLog.findMany({
    where: {
      OR: [
        { status: { in: ["failed", "uncertain"] } },
        { status: "sending", updatedAt: { lt: new Date(Date.now() - 600000) } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export async function deliverOnce(
  key: Key,
  prepare: () => Promise<null | (() => Promise<void>)>,
): Promise<DeliveryResult> {
  const where = { type_period: key };
  await db.reportLog.createMany({
    data: { ...key, status: "ready" },
    skipDuplicates: true,
  });
  if (
    !["ready", "failed"].includes(
      (await db.reportLog.findUniqueOrThrow({ where })).status,
    )
  )
    return "skipped";
  let send;
  try {
    send = await prepare();
  } catch (err) {
    await db.reportLog.updateMany({
      where: { ...key, status: { in: ["ready", "failed"] } },
      data: { status: "failed", error: t.sendError },
    });
    throw err;
  }
  // Commit the claim before handing the message to SMTP. After an ambiguous
  // disconnect, only the recipient's mailbox can establish whether it arrived.
  const claim = await db.reportLog.updateMany({
    where: { ...key, status: { in: ["ready", "failed"] } },
    data: { status: send ? "sending" : "skipped", error: null },
  });
  if (!claim.count || !send) return "skipped";
  try {
    await send();
  } catch (error) {
    const e = error as {
      responseCode?: number;
      command?: string;
      code?: string;
    };
    const failed =
      (e.responseCode !== undefined &&
        e.responseCode >= 400 &&
        e.responseCode < 500 &&
        e.responseCode !== 408 &&
        e.responseCode !== 429) ||
      ["CONN", "AUTH", "MAIL FROM", "RCPT TO"].includes(e.command ?? "") ||
      e.code === "EDNS";
    await db.reportLog.update({
      where,
      data: {
        status: failed ? "failed" : "uncertain",
        error: failed ? t.sendError : t.uncertain,
      },
    });
    throw error;
  }
  await db.reportLog.update({
    where,
    data: { status: "sent", sentAt: new Date() },
  });
  return "sent";
}

export async function sendReport(
  type: Frequency,
  instant: Date,
  testId?: string,
  override?: Range,
): Promise<DeliveryResult> {
  const settings = await getSchedule(),
    s = settings[type];
  if (!testId && !s.enabled) return "skipped";
  const range = override ?? reportPeriod(type, instant),
    period =
      (testId ? "test-" + testId + " " : "") + range.from + "/" + range.to;
  return deliverOnce({ type, period }, async () => {
    if (!s.recipients.length) throw Error(t.noRecipients);
    const r = await loadReport(range);
    if (!testId && !r.total && settings.skipEmpty) return null;
    const html = emailHtml(type, r);
    const attachments =
      type === "monthly"
        ? [
            {
              filename: "report-" + range.from + ".xlsx",
              content: await workbook(r),
            },
          ]
        : [];
    return async () => {
      const info = await sendMail({
        from: process.env.MAIL_FROM || "warehouse@localhost.test",
        to: s.recipients,
        subject: emailSubject(type, range),
        html,
        attachments,
      });
      if (info.rejected.length) throw Error(t.uncertain);
    };
  });
}

// Replay a stored period exactly once. Used by the cron endpoint to retry
// definite delivery failures without recomputing a different range.
export async function retryReport(type: Frequency, period: string) {
  const plain = period.replace(/^test-[^ ]+ /, "");
  const parsed = rangeSchema.safeParse(
    Object.fromEntries(
      plain.split("/").map((value, index) => [
        index === 0 ? "from" : "to",
        value,
      ]),
    ),
  );
  if (!parsed.success) return "skipped" as const;
  return sendReport(
    type,
    new Date(parsed.data.to + "T12:00:00Z"),
    undefined,
    parsed.data,
  );
}
