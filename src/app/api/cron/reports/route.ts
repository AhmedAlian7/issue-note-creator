import { authorizedCron, cronSecretConfigured } from "@/server/reports/cron-auth";
import { runDueReports } from "@/server/reports/schedule";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request) {
  if (!cronSecretConfigured())
    return Response.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  if (!authorizedCron(request.headers))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const results = await runDueReports();
  return Response.json(
    { ok: true, checkedAt: new Date().toISOString(), results },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = handle;
export const POST = handle;
