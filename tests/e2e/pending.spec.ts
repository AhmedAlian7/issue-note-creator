import { expect, test } from "@playwright/test";
import { ar } from "@/lib/i18n";

test("shows pending feedback during navigation and sign-in submission", async ({
  page,
}) => {
  await page.route("**/workspace**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto("/");
  await page.getByRole("link", { name: ar.firstLogin }).click();
  await expect(
    page.getByText(ar.pending.navigation, { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: ar.login, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(ar.pending.navigation)).toHaveCount(0);

  await page.unroute("**/workspace**");
  await page.route("**/login", async (route) => {
    if (route.request().method() === "POST")
      await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.getByLabel(ar.username).fill("pending-test-user");
  const submit = page.getByRole("button", { name: ar.loginContinue });
  await submit.click();
  await expect(submit).toBeDisabled();
  await expect(
    page.getByRole("status").filter({ hasText: ar.pending.action }),
  ).toBeVisible();
  await expect(page.getByLabel(ar.pin)).toBeVisible();
  await expect(page.getByText(ar.pending.action)).toHaveCount(0);
});
