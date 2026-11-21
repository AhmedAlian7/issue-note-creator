import { db } from "./db";
import { audit } from "./audit";
import { authorize, type Actor } from "./permissions";
import { normalize } from "@/ai/matching";
export async function learnAlias(
  actor: Actor,
  kind: "product" | "customer",
  id: string,
  phrase: string,
) {
  authorize(actor, "workspace");
  return db.$transaction(async (tx) => {
    if (kind === "product")
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${id} FOR UPDATE`;
    else
      await tx.$queryRaw`SELECT id FROM "Customer" WHERE id=${id} FOR UPDATE`;
    const where = { id, active: true };
    const row =
      kind === "product"
        ? await tx.product.findFirst({ where })
        : await tx.customer.findFirst({ where });
    if (!row) return null;
    const alias = normalize(phrase);
    if ([row.nameAr, ...row.aliases].some((n) => normalize(n) === alias))
      return row.aliases;
    if (row.aliases.length >= 50) throw new RangeError("Alias limit");
    const aliases = [...row.aliases, alias];
    if (kind === "product")
      await tx.product.update({ where: { id }, data: { aliases } });
    else await tx.customer.update({ where: { id }, data: { aliases } });
    await audit(
      tx,
      actor.id,
      "voice.alias",
      kind === "product" ? "Product" : "Customer",
      id,
      { aliases: row.aliases },
      { aliases },
    );
    return aliases;
  });
}
