import Link from "next/link";
import { ar } from "@/lib/i18n";
import { company, defaultCompany, frequencies } from "@/lib/report-config";
import { defaults, thresholds } from "@/ai/contracts";
import { guard } from "@/server/session";
import { db } from "@/server/db";
import { getSchedule } from "@/server/settings";
import { failedReports } from "@/server/reports/delivery";
import { SettingsForm } from "./settings-form";
const t = ar.reports;
export default async function Settings() {
  await guard("settings.manage");
  const [schedule, rows, failed] = await Promise.all([
    getSchedule(),
    db.setting.findMany({
      where: { key: { in: ["numberingStart", "company", "voiceThresholds"] } },
    }),
    failedReports(),
  ]);
  const values = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return (
    <main className="desk">
      <nav className="tools">
        <Link href="/workspace">{ar.workspace}</Link>
        <Link href="/dashboard">{t.dashboard}</Link>
      </nav>
      <header>
        <h1>{t.settings}</h1>
      </header>
      <SettingsForm
        schedule={schedule}
        company={company.safeParse(values.company).data ?? defaultCompany}
        start={Number(values.numberingStart ?? 973)}
        limits={thresholds.safeParse(values.voiceThresholds).data ?? defaults}
      />
      <section className="report-panel">
        <h2>{t.failed}</h2>
        {failed.length ? (
          <ul>
            {failed.map((r) => (
              <li key={r.type + r.period}>
                {t[frequencies.find((k) => k === r.type)!]} ·{" "}
                <bdi>{r.period}</bdi> · {r.error ?? t.uncertain}
              </li>
            ))}
          </ul>
        ) : (
          <p>{ar.empty}</p>
        )}
      </section>
    </main>
  );
}
