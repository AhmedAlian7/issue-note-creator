import { VoiceFlow } from "../voice/flow";
import Link from "@/app/brand/pending-link";
import { guard } from "@/server/session";
import { allowed } from "@/server/permissions";
import { SubmitButton } from "@/app/brand/submit-button";
import { ar } from "@/lib/i18n";
import { recentNotes, duplicateNote, noteCatalog } from "@/server/notes";
import { redirect } from "next/navigation";
import { NoteList } from "../notes/note-list";
export default async function Workspace() {
  const user = await guard("workspace");
  const recent = allowed(user.role, "note.create")
    ? await recentNotes(user)
    : null;
  const header = (
    <header>
      <p>
        <bdi>{user.name}</bdi> · {ar[user.role]}
      </p>
      <h1>{ar.workspace}</h1>
      {recent && <p>{ar.navigation.recordHint}</p>}
    </header>
  );
  const shortcuts = recent && (
    <div className="workspace-notes">
      <Link className="action new-note" href="/notes/new">
        {ar.notes.newNote}
      </Link>
      {!!recent.customers.length && (
        <section>
          <h2>{ar.notes.shortcuts}</h2>
          <div className="choices">
            {recent.customers.map((c) => (
              <Link
                className="shortcut-link"
                key={c.id}
                href={"/notes/new?customerId=" + c.id}
              >
                <bdi>{c.nameAr}</bdi>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="fields">
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
            <SubmitButton className="secondary">
              {ar.notes.duplicate}
            </SubmitButton>
          </form>
        )}
        <NoteList rows={recent.rows} />
      </section>
    </div>
  );
  const catalog = recent ? await noteCatalog(user) : null;
  return (
    <main className="desk">
      {catalog ? (
        <VoiceFlow
          userId={user.id}
          header={header}
          products={catalog.products.filter((p) => p.active)}
          customers={catalog.customers.filter((c) => c.active)}
        >
          {shortcuts}
        </VoiceFlow>
      ) : (
        <>
          {header}
          <Link href="/voice">{ar.voice.title}</Link>
        </>
      )}
    </main>
  );
}
