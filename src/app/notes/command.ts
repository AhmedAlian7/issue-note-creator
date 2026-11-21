import { ar } from "@/lib/i18n";
export async function command(
  payload: object,
): Promise<{ id: string; updatedAt?: string }> {
  const res = await fetch("/api/warehouse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw Error((await res.json().catch(() => null))?.error || ar.notes.error);
  return res.json();
}
