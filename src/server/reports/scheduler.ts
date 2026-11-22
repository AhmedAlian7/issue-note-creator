import { PgBoss, fromPrisma } from "pg-boss";
import { db, type Prisma } from "../db";
import { frequencies, zone, type Schedule } from "@/lib/report-config";
import { getSchedule } from "../settings";
import { sendReport } from "./delivery";
import { cron, scheduledDay } from "./period";
const state = globalThis as typeof globalThis & {
  reportWorker?: Promise<PgBoss>;
};
export async function configure(
  boss: PgBoss,
  tx: Prisma.TransactionClient,
  s: Schedule,
) {
  const connection = fromPrisma(tx);
  for (const type of frequencies) {
    const name = "report-" + type,
      expr = cron(type, s);
    if (s[type].enabled)
      await boss.schedule(
        name,
        expr,
        { expr },
        {
          db: connection,
          tz: zone,
          missed: "once",
          retryLimit: 5,
          retryDelay: 30,
          retryBackoff: true,
        },
      );
    else await boss.unschedule(name, "", { db: connection });
  }
}
export async function startReportWorker() {
  const boss = new PgBoss(process.env.DATABASE_URL!);
  boss.on("error", (err) => console.error("Report scheduler", err.message));
  try {
    await boss.start();
    for (const type of frequencies) {
      const name = "report-" + type;
      await boss.createQueue(name);
      await boss.work<{ expr: string }, void, { includeMetadata: true }>(
        name,
        { includeMetadata: true },
        async ([job]) => {
          const s = await getSchedule();
          if (!s[type].enabled || job.data.expr !== cron(type, s)) return;
          await sendReport(
            type,
            new Date(scheduledDay(type, s, job.createdOn) + "T12:00:00Z"),
          );
        },
      );
    }
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('reportSchedule'))::text`;
      await configure(boss, tx, await getSchedule(tx));
    });
    return boss;
  } catch (error) {
    await boss.stop();
    throw error;
  }
}
export function reportWorker() {
  return (state.reportWorker ??= startReportWorker().catch((err) => {
    delete state.reportWorker;
    throw err;
  }));
}
