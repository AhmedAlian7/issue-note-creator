import Link from "next/link";
import { guard } from "@/server/session";
import { allowed } from "@/server/permissions";
import { ar } from "@/lib/i18n";
import { signOut } from "../login/actions";
export default async function Workspace() {
  const user = await guard("workspace");
  return (
    <main className="desk">
      <header>
        <p>
          {user.name} · {ar[user.role]}
        </p>
        <h1>{ar.workspace}</h1>
      </header>
      <nav className="menu">
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
