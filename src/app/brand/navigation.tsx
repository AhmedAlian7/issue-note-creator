"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { ar } from "@/lib/i18n";

export function Navigation({
  items,
  account,
}: {
  items: { href: string; label: string }[];
  account: React.ReactNode;
}) {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const links = items.map(({ href, label }) => {
    const active = href === pathname;
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        onClick={() => menu.current?.removeAttribute("open")}
      >
        {label}
      </Link>
    );
  });

  return (
    <>
      <nav aria-label={ar.navigation.menu} className="brand-desktop-nav">
        {links}
        {account}
      </nav>
      <details ref={menu} className="brand-mobile-nav">
        <summary>{ar.navigation.menu}</summary>
        <nav aria-label={ar.navigation.menu}>
          {links}
          {account}
        </nav>
      </details>
    </>
  );
}
