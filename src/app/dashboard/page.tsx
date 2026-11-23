import Link from "next/link";
import { ar } from "@/lib/i18n";
import { guard } from "@/server/session";
import { loadReport } from "@/server/reports";
import { preset, rangeSchema } from "@/server/reports/period";
import { db } from "@/server/db";
import { archiveStatus } from "@/server/notes";
import { hasPdf } from "@/server/pdf-storage";
import { Chart, FeedRefresh } from "./charts";
const t = ar.reports;
export default async function Dashboard({
  searchParams,
}: PageProps<"/dashboard">) {
  await guard("settings.manage");
  const q = await searchParams;
  const range = rangeSchema.safeParse(
    Object.keys(q).length ? q : preset("today"),
  );
  if (!range.success)
    return (
      <main className="desk">
        <p>{ar.invalid}</p>
        <Link href="/dashboard">{ar.back}</Link>
      </main>
    );
  const [r, feed] = await Promise.all([
    loadReport(range.data),
    db.issueNote.findMany({
      take: 10,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        number: true,
        status: true,
        successor: { select: { status: true } },
        pdfPath: true,
        pdf: { select: { byteSize: true } },
        date: true,
        customer: { select: { nameAr: true } },
      },
    }),
  ]);
  const params = new URLSearchParams(r.range).toString();
  return (
    <main className="desk report-desk">
      <nav className="tools">
        <Link href="/workspace">{ar.workspace}</Link>
        <Link href="/settings">{t.settings}</Link>
        <Link href={"/archive?" + params}>{ar.notes.archive}</Link>
      </nav>
      <header>
        <h1>{t.dashboard}</h1>
        <p>
          {r.range.from} — {r.range.to}
        </p>
      </header>
      <nav className="tools">
        {(["today", "week", "month"] as const).map((k) => (
          <Link key={k} href={"/dashboard?" + new URLSearchParams(preset(k))}>
            {t[k]}
          </Link>
        ))}
      </nav>
      <details>
        <summary>{t.custom}</summary>
        <form className="fields filter-grid">
          <label>
            {ar.notes.from}
            <input
              required
              type="date"
              name="from"
              defaultValue={r.range.from}
            />
          </label>
          <label>
            {ar.notes.to}
            <input required type="date" name="to" defaultValue={r.range.to} />
          </label>
          <button>{ar.search}</button>
        </form>
      </details>
      <div className="report-grid">
        {[
          [t.total, r.total],
          [t.units, r.units],
          [t.average, r.average.toFixed(2)],
        ].map(([label, value]) => (
          <section key={label} className="report-panel">
            <h2>{label}</h2>
            <strong className="kpi">{value}</strong>
          </section>
        ))}
      </div>
      <p>
        {t.comparison} ({r.previous.range.from} — {r.previous.range.to}) ·{" "}
        {t.total} <bdi>{r.delta.total}</bdi> · {t.units}{" "}
        <bdi>{r.delta.units}</bdi>
      </p>
      <nav className="tools">
        {(["csv", "xlsx"] as const).map((f) => (
          <a key={f} href={"/api/reports/export?" + params + "&format=" + f}>
            {f === "csv" ? t.csv : t.excel}
          </a>
        ))}
      </nav>
      <div className="report-grid charts">
        {(
          [
            [t.days, r.days],
            [t.top, r.top],
            [t.customers, r.customers],
            [t.destinations, r.destinations],
          ] as const
        ).map(([title, rows]) => (
          <Chart key={title} title={title} rows={rows} />
        ))}
      </div>
      <section className="report-panel">
        <h2>{t.slow}</h2>
        <ol>
          {r.slow.map((b, i) => (
            <li key={i}>
              {b.name} · {b.units}
            </li>
          ))}
        </ol>
      </section>
      <section className="report-panel">
        <h2>{t.feed}</h2>
        <FeedRefresh />
        {!feed.length && <p>{ar.empty}</p>}
        {feed.map((n) => (
          <div className="tools" key={n.id}>
            <Link href={"/notes/" + n.id}>
              {n.number ?? ar.notes.DRAFT} · {n.customer.nameAr} ·{" "}
              {ar.notes[archiveStatus(n)]} · {n.date.toISOString().slice(0, 10)}
            </Link>
            {hasPdf(n) && (
              <a href={"/api/notes/" + n.id + "/pdf"}>{ar.notes.download}</a>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
