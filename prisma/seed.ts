import "dotenv/config";
import { randomInt } from "node:crypto";
import { db } from "../src/server/db";
import { audit } from "../src/server/audit";
import { hashPin } from "../src/server/auth";

const products = [
  "ثلاثية سيدني",
  "ثنائية سيدني",
  "ثنائية جولدي",
  "فوتيه سيدني",
  "كرسي نوبل",
];
const customers = [
  "شركة MENON",
  ...Array.from({ length: 4 }, (_, i) => "عميل مؤقت " + (i + 1)),
];
const accounts = [
  { name: "مالك تجريبي", role: "OWNER", phone: "01000000973" },
  { name: "مدير تجريبي", role: "ADMIN", phone: "01000000974" },
  { name: "أمين مخزن تجريبي", role: "KEEPER", phone: "01000000975" },
] as const;
const seedId = (group: number, i: number) =>
  `00000000-0000-4000-800${group}-${String(i + 1).padStart(12, "0")}`;

try {
  const credentials = await db.$transaction(
    async (tx) => {
      const credentials: string[] = [];
      for (const account of accounts) {
        if (await tx.user.findUnique({ where: { phone: account.phone } }))
          continue;
        const pin = String(randomInt(100000, 1000000));
        const user = await tx.user.create({
          data: { ...account, pinHash: await hashPin(pin) },
        });
        await audit(tx, null, "seed.create", "User", user.id, undefined, user);
        credentials.push([account.role, account.phone, pin].join("  "));
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
      return credentials;
    },
    { timeout: 30000 },
  );
  console.log(
    credentials.length
      ? "Demo accounts (role, phone, PIN)\n" + credentials.join("\n")
      : "Seed already applied.",
  );
} finally {
  await db.$disconnect();
}
