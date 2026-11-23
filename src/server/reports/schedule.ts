import { frequencies, type Frequency } from "@/lib/report-config";
import { getSchedule } from "../settings";
import { failedReports, retryReport, sendReport } from "./delivery";
import { scheduledDay } from "./period";

export type ReportRun = {
  type: Frequency;
  period?: string;
  status: "sent" | "skipped" | "failed" | "disabled";
  error?: string;
};

// GitHub Actions calls this hourly. ReportLog makes each period idempotent, so
// a retry, a duplicate workflow run, or a manual invocation cannot send twice.
export async function runDueReports(now = new Date()): Promise<ReportRun[]> {
  const schedule = await getSchedule();
  const results: ReportRun[] = [];
  for (const type of frequencies) {
    if (!schedule[type].enabled) {
      results.push({ type, status: "disabled" });
      continue;
    }
    const period = scheduledDay(type, schedule, now);
    try {
      const status = await sendReport(
        type,
        new Date(period + "T12:00:00Z"),
      );
      results.push({ type, period, status });
    } catch (error) {
      results.push({
        type,
        period,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  for (const row of await failedReports()) {
    if (row.status !== "failed") continue;
    if (Date.now() - row.updatedAt.getTime() < 600000) continue;
    if (!frequencies.includes(row.type as Frequency)) continue;
    try {
      const status = await retryReport(row.type as Frequency, row.period);
      results.push({ type: row.type as Frequency, period: row.period, status });
    } catch (error) {
      results.push({
        type: row.type as Frequency,
        period: row.period,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
    if (results.filter((r) => r.status === "failed").length >= 5) break;
  }
  return results;
}
