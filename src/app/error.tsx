"use client";

import { ar } from "@/lib/i18n";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="desk narrow">
      <h1>{ar.errors.title}</h1>
      <button onClick={reset}>{ar.errors.retry}</button>
    </main>
  );
}
