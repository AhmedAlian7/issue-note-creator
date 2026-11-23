import Link from "@/app/brand/pending-link";
import { guard } from "@/server/session";
import { listNotes, noteCatalog } from "@/server/notes";
import { filters } from "@/lib/note-filters";
import { SearchForm } from "@/app/brand/search-form";
import { ar } from "@/lib/i18n";
import { NoteList } from "../notes/note-list";
const t = ar.notes;
export default async function Archive({ searchParams }: PageProps<"/archive">) {
  const user = await guard("note.read");
  const parsed = filters.safeParse(
    Object.fromEntries(
      Object.entries(await searchParams).filter(([, v]) => v !== ""),
    ),
  );
  const f = parsed.data ?? {};
  const [rows, { products }] = await Promise.all([
    parsed.success ? listNotes(user, f) : [],
    noteCatalog(user),
  ]);
  return (
    <main className="desk">
      <Link href="/workspace">{ar.back}</Link>
      <header>
        <h1>{t.archive}</h1>
      </header>
      <SearchForm className="fields">
        <label>
          {t.search}
          <input name="q" defaultValue={f.q} />
        </label>
        <div className="filter-grid">
          <label>
            {t.from}
            <input type="date" name="from" defaultValue={f.from} />
          </label>
          <label>
            {t.to}
            <input type="date" name="to" defaultValue={f.to} />
          </label>
          <label>
            {ar.products}
            <select name="productId" defaultValue={f.productId}>
              <option value="">{t.all}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameAr}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.status}
            <select name="status" defaultValue={f.status}>
              <option value="">{t.all}</option>
              {(["DRAFT", "CONFIRMED", "VOIDED", "SUPERSEDED"] as const).map(
                (s) => (
                  <option key={s} value={s}>
                    {t[s]}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
      </SearchForm>
      {parsed.success ? <NoteList rows={rows} /> : <p>{ar.invalid}</p>}
    </main>
  );
}
