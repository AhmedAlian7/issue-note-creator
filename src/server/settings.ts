import { z } from "zod";
import { company, reportSchedule, defaultSchedule } from "@/lib/report-config";
import { thresholds } from "@/ai/contracts";
import { db, type Prisma } from "./db";
import { audit } from "./audit";
import { authorize, type Actor } from "./permissions";

export const settingInput = z.discriminatedUnion("key", [
  z.object({ key: z.literal("voiceThresholds"), value: thresholds }),
  z.object({
    key: z.literal("numberingStart"),
    value: z.int().positive().max(2147483646),
  }),
  z.object({
    key: z.literal("company"),
    value: company,
  }),
  z.object({
    key: z.literal("reportSchedule"),
    value: reportSchedule,
  }),
  z.object({
    key: z.literal("reportRecipients"),
    value: z.array(z.email()).max(100),
  }),
]);
export async function getSchedule(client: Prisma.TransactionClient = db) {
  const row = await client.setting.findUnique({
    where: { key: "reportSchedule" },
  });
  const parsed = reportSchedule.safeParse(row?.value);
  return parsed.success ? parsed.data : defaultSchedule;
}
export async function saveSetting(
  actor: Actor,
  data: z.infer<typeof settingInput>,
) {
  authorize(actor, "settings.manage");
  const scheduler =
    data.key === "reportSchedule"
      ? await import("./reports/scheduler")
      : undefined;
  const boss = await scheduler?.reportWorker();
  await db.$transaction(async (tx) => {
    // Also serialize concurrent inserts when the setting does not yet exist.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${data.key}))::text`;
    const before = await tx.setting.findUnique({ where: { key: data.key } });
    const after = await tx.setting.upsert({
      where: { key: data.key },
      create: data,
      update: { value: data.value },
    });
    if (data.key === "reportSchedule" && boss && scheduler)
      await scheduler.configure(boss, tx, data.value);
    await audit(
      tx,
      actor.id,
      before ? "update" : "create",
      "Setting",
      data.key,
      before ?? undefined,
      after,
    );
  });
}
