export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    const { reportWorker } = await import("./server/reports/scheduler");
    const connect = () => {
      void reportWorker().catch(() => {
        console.error("Report scheduler unavailable; retrying in 30 seconds");
        setTimeout(connect, 30000).unref();
      });
    };
    connect();
  }
}
