import { retryConfirmations } from "@/server/reports/confirmation";
import { apiRoute } from "@/server/http";
import { ar } from "@/lib/i18n";
import { authorizedCron } from "@/server/reports/cron-auth";
import { runDueReports } from "@/server/reports/schedule";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const handle = apiRoute("cron.reports", async (request: Request) => {
  if (!authorizedCron(request.headers))
    return Response.json({ error: ar.login }, { status: 401 });
  if (request.body)
    return Response.json({ error: ar.invalid }, { status: 400 });
  const [results] = await Promise.all([runDueReports(), retryConfirmations()]);
  return Response.json(
    {
      ok: true,
      checkedAt: new Date().toISOString(),
      results: results.map(({ type, period, status }) => ({
        type,
        period,
        status,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});

export const GET = handle;
export const POST = handle;
