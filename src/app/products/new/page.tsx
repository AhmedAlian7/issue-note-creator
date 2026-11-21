import Link from "next/link";
import { CatalogForm } from "../../catalog-forms";
import { guard } from "@/server/session";
import { ar } from "@/lib/i18n";
export default async function NewProduct() {
  await guard("product.add");
  return (
    <main className="desk narrow">
      <Link href="/workspace">{ar.back}</Link>
      <header>
        <h1>{ar.addProduct}</h1>
      </header>
      <CatalogForm entity="product" />
    </main>
  );
}
