import { apiRoute } from "@/server/http";
import { z } from "zod";
import { currentUser } from "@/server/session";
import { rangeSchema } from "@/server/reports/period";
import { loadReport } from "@/server/reports";
import { csv, workbook } from "@/server/reports/export";
export const GET = apiRoute(
  "reports.export",
  async (req: Request) => {
    const actor = await currentUser();
    if (actor?.role !== "OWNER")
      return new Response(null, { status: actor ? 403 : 401 });
    const q = rangeSchema
      .safeExtend({ format: z.enum(["csv", "xlsx"]) })
      .strict()
      .safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!q.success) return new Response(null, { status: 400 });
    const { format, ...range } = q.data;
    const r = await loadReport(range);
    const excel = format === "xlsx";
    return new Response(excel ? new Uint8Array(await workbook(r)) : csv(r), {
      headers: {
        "Content-Type": excel
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="report-' +
          range.from +
          "-" +
          range.to +
          "." +
          format +
          '"',
        "Cache-Control": "private, no-store",
      },
    });
  },
  true,
);
