import { ar } from "@/lib/i18n";
import { chromiumHealthy } from "@/pdf/chromium";
import { rendererName } from "@/pdf/render-note-pdf";
import { db } from "@/server/db";
import { apiRoute } from "@/server/http";
import { authorizedCron } from "@/server/reports/cron-auth";

export const dynamic = "force-dynamic";

async function databaseHealthy() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      db.$queryRaw`SELECT 1`.then(() => true),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), 5000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export const GET = apiRoute("health", async (request) => {
  if (!authorizedCron(request.headers, process.env.HEALTH_SECRET || ""))
    return Response.json({ error: ar.login }, { status: 401 });
  const remote = rendererName() !== "playwright";
  const [database, chromium] = await Promise.allSettled([
    databaseHealthy(),
    remote
      ? Promise.resolve(
          Boolean(
            process.env.CLOUDFLARE_ACCOUNT_ID &&
            process.env.CLOUDFLARE_API_TOKEN,
          ),
        )
      : chromiumHealthy(),
  ]);
  const databaseOk = database.status === "fulfilled" && database.value;
  const chromiumOk = chromium.status === "fulfilled" && chromium.value;
  const ok = databaseOk && chromiumOk;
  return Response.json(
    {
      ok,
      database: databaseOk,
      chromium: chromiumOk,
      renderer: remote ? "cloudflare" : "playwright",
    },
    { status: ok ? 200 : 503 },
  );
});
