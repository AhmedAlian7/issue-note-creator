import Link from "next/link";
import { ar } from "@/lib/i18n";
import { archiveStatus, type listNotes } from "@/server/notes";
const t = ar.notes;
export function NoteList({
  rows,
}: {
  rows: Awaited<ReturnType<typeof listNotes>>;
}) {
  return rows.length ? (
    <ul>
      {rows.map((n) => (
        <li key={n.id}>
          <Link className="note-row" href={"/notes/" + n.id}>
            <b>
              {n.number ?? t.DRAFT} · {n.customer.nameAr}
            </b>
            <span>
              {t[archiveStatus(n)]} · {n.date.toISOString().slice(0, 10)} ·{" "}
              {t.items} {n._count.lines} · {t.version} {n.version}
            </span>
          </Link>
          {n.pdfPath && <a href={"/api/notes/" + n.id + "/pdf"}>{t.open}</a>}
        </li>
      ))}
    </ul>
  ) : (
    <p>{ar.empty}</p>
  );
}
