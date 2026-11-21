import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ar } from "@/lib/i18n";
import { listCatalog } from "@/server/catalog-list";
import { guard } from "@/server/session";
import { CatalogForm, StateButton } from "../../catalog-forms";
const sections = {
  products: ["product", "product.manage", "addProduct"],
  customers: ["customer", "customer.manage", "addCustomer"],
  users: ["user", "user.screen", "addUser"],
} as const;
export default async function Catalog({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const path = z
    .enum(["products", "customers", "users"])
    .safeParse((await params).section);
  if (!path.success) notFound();
  const section = path.data;
  const [entity, action, add] = sections[section];
  const actor = await guard(action);
  const query = z
    .string()
    .trim()
    .max(180)
    .optional()
    .safeParse((await searchParams).q);
  if (!query.success) notFound();
  const matches = await listCatalog(actor, entity, query.data ?? "");
  return (
    <main className="desk">
      <Link href="/workspace">{ar.back}</Link>
      <header>
        <h1>{ar[section]}</h1>
      </header>
      <details className="add">
        <summary>{ar[add]}</summary>
        <CatalogForm entity={entity} />
      </details>
      <form className="search">
        <input
          name="q"
          aria-label={ar.search}
          placeholder={ar.search}
          maxLength={180}
          defaultValue={query.data}
        />
        <button>{ar.search}</button>
      </form>
      <ul>
        {matches.map((row) => (
          <li key={row.id}>
            <h2>{"nameAr" in row ? row.nameAr : row.name}</h2>
            {"role" in row && (
              <p>
                {ar[row.role]} · <bdi>{row.phone}</bdi>
              </p>
            )}
            {!row.active && <strong>{ar.archived}</strong>}
            {"needsReview" in row && row.needsReview && (
              <strong>{ar.needsReview}</strong>
            )}
            <div className="tools">
              <details>
                <summary>{ar.edit}</summary>
                <CatalogForm entity={entity} row={row} />
              </details>
              {"needsReview" in row && row.needsReview && (
                <StateButton entity={entity} id={row.id} operation="review" />
              )}
              {row.active && (
                <StateButton entity={entity} id={row.id} operation="archive" />
              )}
            </div>
          </li>
        ))}
      </ul>
      {!matches.length && <p>{ar.empty}</p>}
    </main>
  );
}
