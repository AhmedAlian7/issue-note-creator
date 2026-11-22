"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ar } from "@/lib/i18n";
import type { Bucket } from "@/server/reports/aggregate";
export function FeedRefresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
export function Chart({ title, rows }: { title: string; rows: Bucket[] }) {
  return (
    <section className="report-panel">
      <h2>{title}</h2>
      {rows.some((r) => r.units) ? (
        <>
          <div dir="ltr" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ left: 0, right: 8, bottom: 12 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} width={32} />
                <Tooltip />
                <Bar
                  dataKey="units"
                  name={ar.reports.units}
                  fill="#156873"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <details>
            <summary>
              {ar.reports.notes} · {title}
            </summary>
            <table>
              <tbody>
                {rows.map((b, i) => (
                  <tr key={i}>
                    <th>{b.name}</th>
                    <td>
                      {ar.reports.units} {b.units}
                    </td>
                    <td>
                      {ar.reports.total} {b.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <p>{ar.reports.none}</p>
      )}
    </section>
  );
}
