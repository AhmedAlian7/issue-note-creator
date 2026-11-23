import { z } from "zod";
import { id } from "@/lib/inputs";
import { notePdfDisposition } from "@/lib/note-pdf-name";
import { currentUser } from "@/server/session";
import { getNote } from "@/server/notes";
import { readPdf } from "@/server/pdf-storage";
import { Prisma } from "@/generated/prisma/client";
export async function GET(
  request: Request,
  context: RouteContext<"/api/notes/[id]/pdf">,
) {
  const actor = await currentUser();
  if (!actor) return new Response(null, { status: 401 });
  const path = z.object({ id }).safeParse(await context.params);
  const query = z
    .strictObject({ download: z.literal("1").optional() })
    .safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!path.success || !query.success)
    return new Response(null, { status: 400 });
  try {
    const note = await getNote(actor, path.data.id);
    const pdf = await readPdf(note);
    if (!pdf) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, no-store",
        "Content-Disposition": notePdfDisposition(
          query.data.download ? "attachment" : "inline",
          note.number,
          note.customer.nameAr,
        ),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    )
      return new Response(null, { status: 404 });
    throw error;
  }
}
