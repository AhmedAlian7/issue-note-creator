import { expect, test } from "@playwright/test";
import { ar } from "@/lib/i18n";

test("shows the Arabic home page right-to-left on mobile", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(
    page.getByRole("heading", { level: 1, name: ar.appName }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toHaveCSS("direction", "rtl");
});
