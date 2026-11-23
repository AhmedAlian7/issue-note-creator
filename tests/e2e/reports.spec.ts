import "dotenv/config";
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { db } from "@/server/db";
import { hashPin } from "@/server/auth";
import { ar } from "@/lib/i18n";
const t = ar.reports;
test("owner saves a Cairo schedule and sends a report to MailHog", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const username = "09000000991",
    recipient = randomUUID() + "@example.test";
  await db.user.create({
    data: {
      username,
      name: "مالك",
      role: "OWNER",
      pinHash: await hashPin("12345"),
    },
  });
  await page.goto("/login");
  await page.getByLabel(ar.username).fill(username);
  await page.getByRole("button", { name: ar.loginContinue }).click();
  await page.getByLabel(ar.pin).fill("12345");
  await page.getByRole("button", { name: ar.login }).click();
  await page.waitForURL("**/workspace");
  await page.goto("/settings");
  const daily = page.getByRole("group", { name: t.daily });
  await daily.getByLabel(t.time).fill("21:45");
  await daily.getByLabel(t.recipients).fill(recipient);
  await daily.getByLabel(t.enabled).check();
  await daily
    .locator("xpath=ancestor::form")
    .getByRole("button", { name: ar.save, exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText(ar.saved);
  await page.reload();
  await expect(daily.getByLabel(t.time)).toHaveValue("21:45");
  const saved = await db.setting.findUnique({
    where: { key: "reportSchedule" },
  });
  expect(saved?.value).toMatchObject({
    daily: { enabled: true, time: "21:45", recipients: [recipient] },
  });
  await daily.getByRole("button", { name: t.test }).click();
  await expect(page.getByRole("status")).toHaveText(t.tested);
  await expect
    .poll(async () => {
      const res = await request.get("http://127.0.0.1:8025/api/v2/search", {
        params: { kind: "to", query: recipient },
      });
      return (await res.json()).total;
    })
    .toBeGreaterThan(0);
  await page.getByRole("link", { name: t.dashboard }).click();
  await page.waitForURL("**/dashboard",{timeout:30000});
  await expect(page.getByRole("heading", { name: t.dashboard })).toBeVisible();
  await expect(page.getByRole("link", { name: t.excel })).toBeVisible();
  for(const label of [t.csv,t.excel]){
    const href=await page.getByRole("link",{name:label}).getAttribute("href");
    const file=await page.request.get(href!);
    expect(file.status()).toBe(200);
    expect(file.headers()["content-disposition"]).toContain("attachment");
    expect((await request.get(href!)).status()).toBe(401);
  }
});
