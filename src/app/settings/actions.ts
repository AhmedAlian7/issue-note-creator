"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { guard } from "@/server/session";
import { frequency } from "@/lib/report-config";
import { sendReport } from "@/server/reports/delivery";
import { saveSetting, settingInput } from "@/server/settings";
import { ar } from "@/lib/i18n";
export async function save(input: unknown) {
  const actor = await guard("settings.manage");
  const data = settingInput.safeParse(input);
  if (!data.success) return ar.invalid;
  try {
    await saveSetting(actor, data.data);
    revalidatePath("/settings");
    return ar.saved;
  } catch {
    return ar.notes.error;
  }
}
export async function testReport(input: unknown) {
  await guard("settings.manage");
  const type = frequency.safeParse(input);
  if (!type.success) return ar.invalid;
  try {
    await sendReport(type.data, new Date(), randomUUID());
    return ar.reports.tested;
  } catch (e) {
    return e instanceof Error &&
      (e.message === ar.reports.noRecipients ||
        e.message === ar.reports.missingSecret)
      ? e.message
      : ar.reports.sendError;
  } finally {
    revalidatePath("/settings");
  }
}
