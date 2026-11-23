import "dotenv/config";
import { randomInt } from "node:crypto";
import { it, expect } from "vitest";
import { db } from "@/server/db";
import { hashPin, login, digest } from "@/server/auth";
import { loginInput } from "@/lib/inputs";
it("accepts only a username and a 4–6 digit PIN", () => {
  for (const pin of ["123", "1234567", "abcd"])
    expect(loginInput.safeParse({ username: "01000000000", pin }).success).toBe(
      false,
    );
  expect(loginInput.parse({ username: "٠١٠٠٠٠٠٠٠٠٠", pin: "٠١٢٣" }).pin).toBe(
    "0123",
  );
});
it("verifies Argon2 PINs, audits attempts, rejects inactive users and limits guessing", async () => {
  const username = "09" + randomInt(100000000, 999999999);
  const user = await db.user.create({
    data: {
      name: "test",
      role: "KEEPER",
      username,
      pinHash: await hashPin("0123"),
    },
  });
  try {
    expect(user.pinHash).toMatch(/^\$argon2id\$/);
    expect(await login({ username, pin: "1111" })).toBeNull();
    const token = await login({ username, pin: "0123" });
    expect(token).toBeTruthy();
    expect(
      await db.session.findUnique({ where: { tokenHash: digest(token!) } }),
    ).toMatchObject({ userId: user.id });
    await db.user.update({ where: { id: user.id }, data: { active: false } });
    expect(await login({ username, pin: "0123" })).toBeNull();
    await db.user.update({ where: { id: user.id }, data: { active: true } });
    for (let i = 0; i < 4; i++)
      expect(await login({ username, pin: "9999" })).toBeNull();
    expect(await login({ username, pin: "0123" })).toBeNull();
    const logs = await db.auditLog.findMany({ where: { userId: user.id } });
    expect(logs.map((l) => l.action).sort()).toEqual(
      ["login", ...Array(6).fill("login.failed"), "login.limited"].sort(),
    );
  } finally {
    await db.loginAttempt.deleteMany({ where: { key: digest(username) } });
    await db.auditLog.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
}, 30000);

it("sets the initial PIN once and requires it on subsequent logins", async () => {
  const username = "enroll-" + randomInt(100000000, 999999999);
  const user = await db.user.create({
    data: { name: "test", role: "KEEPER", username },
  });

  try {
    const initialPin = { username, pin: "0123" };
    expect(await login(initialPin)).toBeNull();
    const claims = await Promise.all([
      login(initialPin, true),
      login({ username, pin: "4567" }, true),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(
      await login({ username, pin: claims[0] ? "0123" : "4567" }),
    ).toBeTruthy();
  } finally {
    await db.loginAttempt.deleteMany({ where: { key: digest(username) } });
    await db.auditLog.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
}, 30000);
