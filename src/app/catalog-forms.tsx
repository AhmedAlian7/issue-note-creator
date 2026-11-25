"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PendingIndicator } from "@/app/brand/pending-indicator";
import { ar } from "@/lib/i18n";
import type { Role } from "@/generated/prisma/enums";
export type Entity = "product" | "customer" | "user";
type RecordFields = {
  id: string;
  name?: string;
  nameAr?: string;
  username?: string;
  role?: Role;
  aliases?: string[];
  category?: string | null;
  defaultDestination?: string | null;
  whatsappGroupName?: string | null;
};
function useMutation() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(command: object) {
    setBusy(true);
    setMessage("");
    try {
      const result = await fetch("/api/warehouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "catalog", command }),
      });
      if (result.status === 401) {
        router.push("/login");
        return false;
      }
      setMessage(
        result.ok
          ? ar.saved
          : result.status === 403
            ? ar.denied
            : result.status === 400
              ? ar.invalid
              : ar.conflict,
      );
      if (result.ok) router.refresh();
      return result.ok;
    } catch {
      setMessage(ar.conflict);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { submit, busy, message };
}
export function CatalogForm({
  entity,
  row,
  initialName,
  requirePin = false,
}: {
  entity: Entity;
  row?: RecordFields;
  initialName?: string;
  requirePin?: boolean;
}) {
  const { submit, busy, message } = useMutation();
  return (
    <form
      className="fields"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fields = Object.fromEntries(new FormData(form));
        const data =
          entity === "user"
            ? { ...fields, pin: fields.pin || undefined }
            : {
                ...fields,
                aliases: String(fields.aliases)
                  .split(/[,،\n]/)
                  .map((v) => v.trim())
                  .filter(Boolean),
              };
        if ((await submit({ kind: entity, id: row?.id, fields: data })) && !row)
          form.reset();
      }}
    >
      <label>
        {ar.name}
        <input
          name={entity === "user" ? "name" : "nameAr"}
          required
          maxLength={180}
          defaultValue={row?.name ?? row?.nameAr ?? initialName}
        />
      </label>
      {entity === "user" ? (
        <>
          <label>
            {ar.username}
            <input
              name="username"
              autoComplete="off"
              dir="ltr"
              required
              defaultValue={row?.username}
            />
          </label>
          {(row || requirePin) && (
            <label>
              {requirePin && !row ? ar.pin : ar.pinOptional}
              <input
                type="password"
                name="pin"
                inputMode="numeric"
                autoComplete="new-password"
                required={requirePin && !row}
                minLength={4}
                maxLength={6}
              />
            </label>
          )}
          <label>
            {ar.role}
            <select name="role" defaultValue={row?.role ?? "KEEPER"}>
              {(["KEEPER", "ADMIN", "OWNER"] as const).map((role) => (
                <option key={role} value={role}>
                  {ar[role]}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <>
          <label>
            {ar.aliases}
            <input name="aliases" defaultValue={row?.aliases?.join("، ")} />
          </label>
          {entity === "product" ? (
            <label>
              {ar.category}
              <input name="category" defaultValue={row?.category ?? ""} />
            </label>
          ) : (
            <>
              <label>
                {ar.destination}
                <input
                  name="defaultDestination"
                  defaultValue={row?.defaultDestination ?? ""}
                />
              </label>
              <label>
                {ar.whatsapp}
                <input
                  name="whatsappGroupName"
                  defaultValue={row?.whatsappGroupName ?? ""}
                />
              </label>
            </>
          )}
        </>
      )}
      <button disabled={busy}>{ar.save}</button>
      <output>{busy ? <PendingIndicator /> : message}</output>
    </form>
  );
}
export function StateButton({
  entity,
  id,
  operation,
}: {
  entity: Entity;
  id: string;
  operation: "review" | "archive";
}) {
  const { submit, busy, message } = useMutation();
  return (
    <span>
      <button
        className="secondary"
        disabled={busy}
        onClick={() => submit({ kind: "state", entity, id, operation })}
      >
        {ar[operation]}
      </button>
      <output>{busy ? <PendingIndicator /> : message}</output>
    </span>
  );
}
