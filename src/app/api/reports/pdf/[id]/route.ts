import { readFile } from "node:fs/promises";
import { z } from "zod";
import { id } from "@/lib/inputs";
import { db } from "@/server/db";
import { validPdf } from "@/server/reports/links";
export async function GET(
  request: Request,
  context: RouteContext<"/api/reports/pdf/[id]">,
) {
  const path = z.object({ id }).safeParse(await context.params),
    query = z
      .strictObject({
        expires: z.coerce.number().int().positive(),
        token: z.string().length(64),
      })
      .safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (
    !path.success ||
    !query.success ||
    !validPdf(path.data.id, query.data.expires, query.data.token)
  )
    return new Response(null, { status: 403 });
  const note = await db.issueNote.findUnique({
    where: { id: path.data.id },
    select: { number: true, pdfPath: true },
  });
  if (!note?.pdfPath) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(await readFile(note.pdfPath)), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="note-' + note.number + '.pdf"',
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
