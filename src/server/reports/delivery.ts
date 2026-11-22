import nodemailer from "nodemailer";
import { ar } from "@/lib/i18n";
import type { Frequency } from "@/lib/report-config";
import { db } from "../db";
import { getSchedule } from "../settings";
import { loadReport } from "./index";
import { emailHtml } from "./email";
import { workbook } from "./export";
import { reportPeriod } from "./period";
const t = ar.reports;
type Key = { type: Frequency; period: string };
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
) {
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
    return;
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
  if (!claim.count || !send) return;
  try {
    await send();
  } catch (error) {
    const e = error as {
      responseCode?: number;
      command?: string;
      code?: string;
    };
    const failed =
      !!e.responseCode ||
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
}
export async function sendReport(
  type: Frequency,
  instant: Date,
  testId?: string,
) {
  const settings = await getSchedule(),
    s = settings[type];
  if (!testId && !s.enabled) return;
  const range = reportPeriod(type, instant),
    period =
      (testId ? "test-" + testId + " " : "") + range.from + "/" + range.to;
  await deliverOnce({ type, period }, async () => {
    if (!s.recipients.length) throw Error(t.noRecipients);
    const r = await loadReport(range);
    if (!testId && !r.total && settings.skipEmpty) return null;
    const html = emailHtml(
      type,
      r,
      process.env.APP_BASE_URL || "http://localhost:3000",
    );
    const attachments =
      type === "monthly"
        ? [
            {
              filename: "report-" + range.from + ".xlsx",
              content: await workbook(r),
            },
          ]
        : [];
    const port = Number(process.env.SMTP_PORT || 587);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    return async () => {
      const info = await transport.sendMail({
        from: process.env.MAIL_FROM || "warehouse@localhost.test",
        bcc: s.recipients,
        subject: t[type] + " · " + range.from + " — " + range.to,
        html,
        attachments,
      });
      if (info.rejected.length) throw Error(t.uncertain);
    };
  });
}
