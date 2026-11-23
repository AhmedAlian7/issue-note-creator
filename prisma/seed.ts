import "dotenv/config";
import { db } from "../src/server/db";
import { audit } from "../src/server/audit";

const products = [
  "ثلاثية سيدني",
  "ثنائية سيدني",
  "ثنائية جولدي",
  "فوتيه سيدني",
  "كرسي نوبل",
];
const customers = ["شركة MENON"];
const accounts = [
  { name: "Ayman", role: "OWNER", username: "ayman" },
  { name: "Ahmed", role: "ADMIN", username: "ahmed" },
  { name: "محمود الدسوقي- أمين مخزن", role: "KEEPER", username: "mahmoud" },
] as const;
const seedId = (group: number, i: number) =>
  `00000000-0000-4000-800${group}-${String(i + 1).padStart(12, "0")}`;

try {
  await db.$transaction(
    async (tx) => {
      for (const account of accounts) {
        if (await tx.user.findUnique({ where: { username: account.username } }))
          continue;
        const user = await tx.user.create({
          data: account,
        });
        await audit(tx, null, "seed.create", "User", user.id, undefined, user);
      }
      for (const [i, nameAr] of products.entries()) {
        const id = seedId(1, i);
        if (await tx.product.findUnique({ where: { id } })) continue;
        const row = await tx.product.create({ data: { id, nameAr } });
        await audit(tx, null, "seed.create", "Product", id, undefined, row);
      }
      for (const [i, nameAr] of customers.entries()) {
        const id = seedId(2, i);
        if (await tx.customer.findUnique({ where: { id } })) continue;
        const row = await tx.customer.create({
          data: { id, nameAr, aliases: i === 0 ? ["MENON", "مينون"] : [] },
        });
        await audit(tx, null, "seed.create", "Customer", id, undefined, row);
      }
    },
    { timeout: 30000 },
  );
} finally {
  await db.$disconnect();
}
