import "dotenv/config";
import { randomInt } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ar } from "@/lib/i18n";
import { db } from "@/server/db";
import { hashPin } from "@/server/auth";
test("keeper signs in and cannot access any admin page", async ({ page }) => {
  const phone = "09" + randomInt(100000000, 999999999);
  const user = await db.user.create({
    data: {
      name: "أمين اختبار",
      role: "KEEPER",
      phone,
      pinHash: await hashPin("01234"),
    },
  });
  try {
    await page.goto("/login");
    await page.getByLabel(ar.phone).fill(phone);
    await page.getByLabel(ar.pin).fill("01234");
    await page.getByRole("button", { name: ar.login }).click();
    await page.getByRole("button", { name: ar.flow.skip }).click();
    await expect(page.getByRole("link", { name: ar.addProduct })).toBeVisible();
    for (const section of ["products", "customers", "users"]) {
      await page.goto("/admin/" + section);
      await expect(page).toHaveURL(/\/workspace$/);
    }
    const cookie = (await page.context().cookies()).find(
      (c) => c.name === "__Host-warehouse",
    );
    expect(cookie).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    });
  } finally {
    await db.auditLog.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
});
