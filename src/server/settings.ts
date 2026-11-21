import { z } from "zod";
import { thresholds } from "@/ai/contracts";
import { db } from "./db";
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
    value: z.record(z.string(), z.string().max(2000)),
  }),
  z.object({
    key: z.literal("reportSchedule"),
    value: z.record(z.string(), z.json()),
  }),
  z.object({
    key: z.literal("reportRecipients"),
    value: z.array(z.email()).max(100),
  }),
]);
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
