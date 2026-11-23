import Link from "next/link";
import { ar } from "@/lib/i18n";
import { allowed } from "@/server/permissions";
import { currentUser } from "@/server/session";
import { signOut } from "../login/actions";
import { Navigation } from "./navigation";
import { Wordmark } from "./wordmark";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) return children;
  const items: { href: string; label: string }[] = [
    { href: "/workspace", label: ar.workspace },
    { href: "/archive", label: ar.notes.archive },
  ];
  if (user.role === "OWNER") {
    items.push(
      { href: "/dashboard", label: ar.reports.dashboard },
      { href: "/settings", label: ar.reports.settings },
    );
  }
  if (allowed(user.role, "product.manage")) {
    items.push(
      { href: "/admin/products", label: ar.products },
      { href: "/admin/customers", label: ar.customers },
    );
  } else if (allowed(user.role, "product.add")) {
    items.push({ href: "/products/new", label: ar.addProduct });
  }
  if (allowed(user.role, "user.screen")) {
    items.push({ href: "/admin/users", label: ar.users });
  }
  return (
    <div className="brand-shell">
      <aside className="brand-sidebar">
        <Link href="/workspace" aria-label={ar.workspace}>
          <Wordmark />
        </Link>
        <Navigation
          items={items}
          account={
            <form action={signOut} className="brand-account">
              <bdi>{user.name}</bdi>
              <button>{ar.logout}</button>
            </form>
          }
        />
      </aside>
      <div className="brand-content">{children}</div>
    </div>
  );
}
