import { text } from "node:stream/consumers";
import { z } from "zod";
import { loginInput } from "../src/lib/inputs";
import { hashPin } from "../src/server/auth";
import { audit } from "../src/server/audit";
import { db } from "../src/server/db";

const owner = loginInput.parse({
  username: process.env.OWNER_USERNAME,
  pin: (await text(process.stdin)).trim(),
});
const name = z.string().trim().min(1).max(180).parse(process.env.OWNER_NAME);
if (owner.pin.length !== 6) throw new Error("Use a six-digit PIN");

try {
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('bootstrap-owner'))::text`;
    if (await tx.user.count({ where: { role: "OWNER" } })) {
      throw new Error("An owner account already exists");
    }
    const user = await tx.user.create({
      data: {
        username: owner.username,
        name,
        role: "OWNER",
        pinHash: await hashPin(owner.pin),
      },
      select: { id: true, username: true },
    });
    await audit(tx, null, "bootstrap.owner", "User", user.id, undefined, user);
  });
  console.log("Owner account created");
} finally {
  await db.$disconnect();
}
