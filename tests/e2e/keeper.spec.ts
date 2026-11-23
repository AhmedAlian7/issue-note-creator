import "dotenv/config";
import { randomInt } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ar } from "@/lib/i18n";
import { db } from "@/server/db";
import { hashPin } from "@/server/auth";
test("keeper signs in and cannot access any admin page", async ({ page }) => {
  const username = "09" + randomInt(100000000, 999999999);
  const user = await db.user.create({
    data: {
      name: "أمين اختبار",
      role: "KEEPER",
      username,
      pinHash: await hashPin("01234"),
    },
  });
  try {
    await page.goto("/login");
    await page.getByLabel(ar.username).fill(username);
    await page.getByRole("button", { name: ar.loginContinue }).click();
    await page.getByLabel(ar.pin).fill("01234");
    await page.getByRole("button", { name: ar.login }).click();
    await page.getByRole("button", { name: ar.flow.skip }).click();
    const menu = page.locator(".brand-mobile-nav summary");
    if (await menu.isVisible()) await menu.click();
    const navigation = page.getByRole("navigation", {
      name: ar.navigation.menu,
    });
    await expect(
      navigation.getByRole("link", { name: ar.workspace }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      navigation.getByRole("link", { name: ar.addProduct }),
    ).toBeVisible();
    await expect(navigation.getByRole("link", { name: ar.users })).toHaveCount(
      0,
    );
    await navigation.getByRole("link", { name: ar.notes.archive }).click();
    await expect(
      page.getByRole("heading", { name: ar.notes.archive }),
    ).toBeVisible();
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
