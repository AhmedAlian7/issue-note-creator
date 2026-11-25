import { randomBytes, createHash } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { db } from "./db";
import { audit } from "./audit";
import { loginInput } from "@/lib/inputs";

export const sessionLifetime = 30 * 24 * 60 * 60;
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const hashPin = (pin: string) =>
  hash(pin, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
const dummyHash = hashPin(randomBytes(24).toString("hex"));
export async function login(input: unknown, enroll = false) {
  const { username, pin } = loginInput.parse(input);
  if (enroll && process.env.REQUIRE_PROVISIONED_PIN === "true") return null;
  const key = digest(username);
  return db.$transaction(async (tx) => {
    const [attempt] = await tx.$queryRaw<{ count: number }[]>`
 INSERT INTO "LoginAttempt" (key,count,"expiresAt") VALUES (${key},1,now()+interval '15 minutes')
 ON CONFLICT (key) DO UPDATE SET count=CASE WHEN "LoginAttempt"."expiresAt" <= now() THEN 1 ELSE least("LoginAttempt".count+1,6) END,
 "expiresAt"=CASE WHEN "LoginAttempt"."expiresAt" <= now() THEN excluded."expiresAt" ELSE "LoginAttempt"."expiresAt" END
 RETURNING count`;
    // Serialize credential changes and session issuance for this account.
    await tx.$queryRaw`SELECT id FROM "User" WHERE username=${username} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { username } });
    const ok =
      attempt.count <= 5 &&
      (enroll && user?.active && user.pinHash === null
        ? true
        : !enroll && (await verify(user?.pinHash ?? (await dummyHash), pin)));
    if (!ok || !user?.active) {
      await audit(
        tx,
        user?.id ?? null,
        attempt.count > 5 ? "login.limited" : "login.failed",
        "User",
        user?.id ?? key,
      );
      return null;
    }
    if (enroll) {
      await tx.user.update({
        where: { id: user.id },
        data: { pinHash: await hashPin(pin) },
      });
      await audit(tx, user.id, "login.pin.set", "User", user.id);
    }
    const token = randomBytes(32).toString("hex");
    await tx.session.create({
      data: {
        userId: user.id,
        tokenHash: digest(token),
        expiresAt: new Date(Date.now() + sessionLifetime * 1000),
      },
    });
    await tx.loginAttempt.delete({ where: { key } });
    await audit(tx, user.id, "login", "User", user.id);
    return token;
  });
}
