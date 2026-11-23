import Link from "next/link";
import { ar } from "@/lib/i18n";
import { hasPdf } from "@/server/pdf-storage";
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
              <bdi>{n.number ?? t.DRAFT}</bdi> · <bdi>{n.customer.nameAr}</bdi>
            </b>
            <span>
              {t[archiveStatus(n)]} ·{" "}
              <bdi>{n.date.toISOString().slice(0, 10)}</bdi> · {t.items}{" "}
              {n._count.lines} · {t.version} {n.version}
            </span>
          </Link>
          {hasPdf(n) && <a href={"/api/notes/" + n.id + "/pdf"}>{t.open}</a>}
        </li>
      ))}
    </ul>
  ) : (
    <p>{ar.empty}</p>
  );
}
