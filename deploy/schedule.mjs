import { setTimeout as sleep } from "node:timers/promises";

while (true) {
  try {
    const response = await fetch("http://app:3000/api/cron/reports", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.CRON_SECRET },
      signal: AbortSignal.timeout(180_000),
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    await response.body?.cancel();
    console.log(
      JSON.stringify({
        event: "reports.checked",
        time: new Date().toISOString(),
      }),
    );
    await sleep(3_600_000);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "reports.check_failed",
        time: new Date().toISOString(),
        errorType: error.name,
      }),
    );
    await sleep(60_000);
  }
}
