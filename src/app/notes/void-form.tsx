"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { command } from "./command";
import { ar } from "@/lib/i18n";
export function VoidForm({ id }: { id: string }) {
  const router = useRouter(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <details>
      <summary>{ar.notes.void}</summary>
      <form
        className="fields"
        onSubmit={async (e) => {
          e.preventDefault();
          const reason = new FormData(e.currentTarget).get("reason");
          setBusy(true);
          try {
            await command({ action: "void", id, reason });
            router.refresh();
          } catch {
            setError(ar.notes.error);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {ar.notes.reason}
          <input name="reason" required maxLength={1000} />
        </label>
        <button disabled={busy}>{ar.notes.void}</button>
        <output>{error}</output>
      </form>
    </details>
  );
}
