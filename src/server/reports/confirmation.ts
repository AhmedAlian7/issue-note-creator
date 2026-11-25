import { confirmationEmailInput } from "../settings";
import { ar } from "@/lib/i18n";
import { db, type Prisma } from "../db";
import { log } from "../log";
import { deliverOnce } from "./delivery";
import { signedPdf } from "./links";
import { sendMail } from "./mailer";

export const confirmationType = "confirmation";

export async function saveConfirmationJob(
  tx: Prisma.TransactionClient,
  noteId: string,
) {
  const setting = await tx.setting.findUnique({
    where: { key: "confirmationEmail" },
  });
  if (!confirmationEmailInput.safeParse(setting?.value).data?.enabled) return;
  await tx.reportLog.create({
    data: { type: confirmationType, period: noteId, status: "ready" },
  });
}

export async function sendConfirmation(noteId: string) {
  const key = { type: confirmationType, period: noteId };
  try {
    const job = await db.reportLog.findUnique({ where: { type_period: key } });
    if (!job) return;
    await deliverOnce(key, async () => {
      const [setting, note] = await Promise.all([
        db.setting.findUnique({ where: { key: "confirmationEmail" } }),
        db.issueNote.findUnique({
          where: { id: noteId },
          select: { number: true },
        }),
      ]);
      const data = confirmationEmailInput.safeParse(setting?.value);
      if (!note?.number || !data.success || !data.data.enabled) return null;
      const t = ar.confirmationEmail;
      const subject = t.subject + " " + note.number;
      const link = signedPdf(noteId)
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;");
      return async () => {
        const { rejected } = await sendMail({
          from: process.env.MAIL_FROM || "warehouse@localhost.test",
          to: [...new Set(data.data.recipients)],
          subject,
          html: `<div lang="ar" dir="rtl"><p>${subject}</p><p><a href="${link}">${t.pdf}</a></p></div>`,
        });
        if (rejected.length) throw new Error("Confirmation recipient rejected");
      };
    });
  } catch (error) {
    log.warn(
      { noteId, errorType: error instanceof Error ? error.name : "Unknown" },
      "Confirmation email failed",
    );
  }
}

export async function retryConfirmations() {
  const jobs = await db.reportLog.findMany({
    where: {
      type: confirmationType,
      status: { in: ["ready", "failed"] },
      updatedAt: { lt: new Date(Date.now() - 60_000) },
    },
    orderBy: { updatedAt: "asc" },
    select: { period: true },
    take: 5,
  });
  await Promise.all(jobs.map(({ period }) => sendConfirmation(period)));
}
