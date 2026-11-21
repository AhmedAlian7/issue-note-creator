import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { id } from "@/lib/inputs";
import { ar } from "@/lib/i18n";
import { Prisma } from "@/generated/prisma/client";
import { guard } from "@/server/session";
import { allowed } from "@/server/permissions";
import { getNote, noteCatalog, archiveStatus } from "@/server/notes";
import { Editor } from "../editor";
import { PdfPreview } from "../pdf-preview";
import { VoidForm } from "../void-form";
const t = ar.notes;
export default async function NotePage(props: PageProps<"/notes/[id]">) {
  const user = await guard("note.read");
  const path = z
    .object({ id: z.union([id, z.literal("new")]) })
    .safeParse(await props.params);
  const query = z
    .object({ customerId: id.optional(), amend: z.literal("1").optional() })
    .safeParse(await props.searchParams);
  if (!path.success || !query.success) notFound();
  const key = path.data.id;
  const note =
    key === "new"
      ? null
      : await getNote(user, key).catch((e) => {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            notFound();
          throw e;
        });
  const amend =
    !!query.data.amend &&
    note?.status === "CONFIRMED" &&
    !note.successor &&
    allowed(user.role, "note.supersede");
  if (
    !note ||
    amend ||
    (note.status === "DRAFT" && allowed(user.role, "note.edit"))
  ) {
    if (!note && !allowed(user.role, "note.create")) redirect("/workspace");
    return (
      <Editor
        {...await noteCatalog(user)}
        noteId={note?.id}
        updatedAt={note?.updatedAt.toISOString()}
        amend={!!amend}
        initial={{
          customerId: note?.customerId ?? query.data.customerId ?? "",
          lines:
            note?.lines.map((l) => ({
              key: l.id,
              productId: l.productId,
              quantity: l.quantity,
              remarks: l.remarks ?? "",
              isDestination: l.isDestination,
            })) ?? [],
        }}
      />
    );
  }
  return (
    <main className="desk issued">
      <header>
        <p>
          {note.customer.nameAr} · {t[archiveStatus(note)]} · {t.version}{" "}
          {note.version}
        </p>
        <h1>
          {ar.notePdf.title} {note.number}
        </h1>
        <p>{note.date.toISOString().slice(0, 10)}</p>
      </header>
      {note.pdfPath && note.number && (
        <PdfPreview
          key={note.id}
          id={note.id}
          number={note.number}
          version={note.version}
        />
      )}
      {note.voidReason && (
        <p>
          {t.reason} · {note.voidReason}
        </p>
      )}
      <nav className="menu">
        {allowed(user.role, "note.create") && (
          <Link href="/notes/new">{t.newNote}</Link>
        )}
        <Link href="/archive">{t.archive}</Link>
        {note.status === "CONFIRMED" &&
          !note.successor &&
          allowed(user.role, "note.supersede") && (
            <>
              <Link href={"/notes/" + key + "?amend=1"}>{t.supersede}</Link>
              <VoidForm id={key} />
            </>
          )}
      </nav>
    </main>
  );
}
