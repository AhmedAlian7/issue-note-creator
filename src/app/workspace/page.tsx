import Link from "next/link";
import { guard } from "@/server/session";
import { allowed } from "@/server/permissions";
import { ar } from "@/lib/i18n";
import { signOut } from "../login/actions";
import { recentNotes, duplicateNote } from "@/server/notes";
import { redirect } from "next/navigation";
import { NoteList } from "../notes/note-list";
export default async function Workspace() {
  const user = await guard("workspace");
  const recent = allowed(user.role, "note.create")
    ? await recentNotes(user)
    : null;
  return (
    <main className="desk">
      <header>
        <p>
          {user.name} · {ar[user.role]}
        </p>
        <h1>{ar.workspace}</h1>
      </header>
      <nav className="menu">
        <Link className="new-note" href="/voice">
          {ar.voice.title}
        </Link>
        {recent && (
          <>
            <Link className="new-note" href="/notes/new">
              {ar.notes.newNote}
            </Link>
            {!!recent.customers.length && (
              <section>
                <h2>{ar.notes.shortcuts}</h2>
                <div className="choices">
                  {recent.customers.map((c) => (
                    <Link key={c.id} href={"/notes/new?customerId=" + c.id}>
                      {c.nameAr}
                    </Link>
                  ))}
                </div>
              </section>
            )}
            <section>
              <h2>{ar.notes.recent}</h2>
              {recent.rows[0] && (
                <form
                  action={async () => {
                    "use server";
                    const actor = await guard("note.create");
                    const copy = await duplicateNote(actor, recent.rows[0].id);
                    redirect("/notes/" + copy.id);
                  }}
                >
                  <button>{ar.notes.duplicate}</button>
                </form>
              )}
              <NoteList rows={recent.rows} />
            </section>
          </>
        )}
        <Link href="/archive">{ar.notes.archive}</Link>
        {allowed(user.role, "product.manage") ? (
          <>
            <Link href="/admin/products">{ar.products}</Link>
            <Link href="/admin/customers">{ar.customers}</Link>
          </>
        ) : (
          <Link href="/products/new">{ar.addProduct}</Link>
        )}
        {allowed(user.role, "user.screen") && (
          <Link href="/admin/users">{ar.users}</Link>
        )}
      </nav>
      <form action={signOut}>
        <button className="secondary">{ar.logout}</button>
      </form>
    </main>
  );
}
