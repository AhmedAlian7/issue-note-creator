import { db } from "./db";
import { authorize, type Actor } from "./permissions";
export function listUsers(actor: Actor, q?: string) {
  authorize(actor, "user.manage");
  return db.user.findMany({
    where: {
      role: actor.role === "ADMIN" ? { not: "OWNER" } : undefined,
      OR: q
        ? [{ name: { contains: q } }, { phone: { contains: q } }]
        : undefined,
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true, role: true, active: true },
  });
}
export async function listCatalog(
  actor: Actor,
  entity: "user" | "product" | "customer",
  q: string,
) {
  if (entity === "user") return listUsers(actor, q);
  authorize(actor, entity === "product" ? "product.manage" : "customer.manage");
  const rows =
    entity === "product"
      ? await db.product.findMany({ orderBy: { nameAr: "asc" } })
      : await db.customer.findMany({ orderBy: { nameAr: "asc" } });
  return rows.filter((row) =>
    [row.nameAr, ...row.aliases].some((value) =>
      value.toLocaleLowerCase().includes(q.toLocaleLowerCase()),
    ),
  );
}
