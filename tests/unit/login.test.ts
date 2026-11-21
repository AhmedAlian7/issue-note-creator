import "dotenv/config";
import { randomInt } from "node:crypto";
import { it, expect } from "vitest";
import { db } from "@/server/db";
import { hashPin, login, digest } from "@/server/auth";
import { loginInput } from "@/lib/inputs";
it("accepts only a phone and a 4–6 digit PIN", () => {
  for (const pin of ["123", "1234567", "abcd"])
    expect(loginInput.safeParse({ phone: "01000000000", pin }).success).toBe(
      false,
    );
  expect(loginInput.parse({ phone: "٠١٠٠٠٠٠٠٠٠٠", pin: "٠١٢٣" }).pin).toBe(
    "0123",
  );
});
it("verifies Argon2 PINs, audits attempts, rejects inactive users and limits guessing", async () => {
  const phone = "09" + randomInt(100000000, 999999999);
  const user = await db.user.create({
    data: {
      name: "test",
      role: "KEEPER",
      phone,
      pinHash: await hashPin("0123"),
    },
  });
  try {
    expect(user.pinHash).toMatch(/^\$argon2id\$/);
    expect(await login({ phone, pin: "1111" })).toBeNull();
    const token = await login({ phone, pin: "0123" });
    expect(token).toBeTruthy();
    expect(
      await db.session.findUnique({ where: { tokenHash: digest(token!) } }),
    ).toMatchObject({ userId: user.id });
    await db.user.update({ where: { id: user.id }, data: { active: false } });
    expect(await login({ phone, pin: "0123" })).toBeNull();
    await db.user.update({ where: { id: user.id }, data: { active: true } });
    for (let i = 0; i < 4; i++)
      expect(await login({ phone, pin: "9999" })).toBeNull();
    expect(await login({ phone, pin: "0123" })).toBeNull();
    const logs = await db.auditLog.findMany({ where: { userId: user.id } });
    expect(logs.map((l) => l.action).sort()).toEqual(
      ["login", ...Array(6).fill("login.failed"), "login.limited"].sort(),
    );
  } finally {
    await db.loginAttempt.deleteMany({ where: { key: digest(phone) } });
    await db.auditLog.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
}, 30000);
