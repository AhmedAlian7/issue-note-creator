import { z } from "zod";
import { company, reportSchedule, defaultSchedule } from "@/lib/report-config";
import { thresholds } from "@/ai/contracts";
import { db, type Prisma } from "./db";
import { audit } from "./audit";
import { authorize, type Actor } from "./permissions";

export const confirmationEmailInput = z
  .strictObject({
    enabled: z.boolean(),
    recipients: z.array(z.email().max(254)).max(100),
  })
  .refine((v) => !v.enabled || v.recipients.length > 0);

export const settingInput = z.discriminatedUnion("key", [
  z.strictObject({ key: z.literal("voiceThresholds"), value: thresholds }),
  z.strictObject({
    key: z.literal("confirmationEmail"),
    value: confirmationEmailInput,
  }),
  z.strictObject({
    key: z.literal("numberingStart"),
    value: z.int().positive().max(2147483646),
  }),
  z.strictObject({
    key: z.literal("company"),
    value: company,
  }),
  z.strictObject({
    key: z.literal("reportSchedule"),
    value: reportSchedule,
  }),
  z.strictObject({
    key: z.literal("reportRecipients"),
    value: z.array(z.email().max(254)).max(100),
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
  await db.$transaction(async (tx) => {
    // Also serialize concurrent inserts when the setting does not yet exist.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${data.key}))::text`;
    const before = await tx.setting.findUnique({ where: { key: data.key } });
    const after = await tx.setting.upsert({
      where: { key: data.key },
      create: data,
      update: { value: data.value },
    });
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
