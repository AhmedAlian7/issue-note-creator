"use client";

import { useEffect, useState } from "react";
import { ar } from "@/lib/i18n";
import { PendingIndicator } from "./pending-indicator";

export function SearchForm({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const reset = () => setPending(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  return (
    <form
      className={className}
      onSubmit={(event) => {
        if (pending) event.preventDefault();
        else setPending(true);
      }}
    >
      {children}
      <button type="submit" disabled={pending}>
        {ar.search}
      </button>
      {pending && (
        <span className="navigation-progress" role="status">
          <PendingIndicator />
        </span>
      )}
    </form>
  );
}
