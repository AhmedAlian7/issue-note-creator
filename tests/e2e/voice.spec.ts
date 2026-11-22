import { randomInt } from "node:crypto";
import { test, expect } from "@playwright/test";
import { db } from "@/server/db";
import { hashPin } from "@/server/auth";
import { ar } from "@/lib/i18n";
test.use({
  permissions: ["microphone"],
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
});
test("keeper records, pauses, resumes and can recover by typing", async ({
  page,
}) => {
  const keeper = await db.user.create({
    data: {
      name: "أمين",
      phone: "08" + randomInt(100000000, 999999999),
      pinHash: await hashPin("01234"),
      role: "KEEPER",
    },
  });
  try {
    await page.goto("/login");
    await page.getByLabel(ar.phone).fill(keeper.phone);
    await page.getByLabel(ar.pin).fill("01234");
    await page.getByRole("button", { name: ar.login }).click();
    await page.getByRole("button", { name: ar.flow.skip }).click();
    await page.getByRole("button", { name: ar.voice.start }).click();
    await page.getByRole("button", { name: ar.voice.pause }).click();
    await page.getByRole("button", { name: ar.voice.resume }).click();
    await expect(page.locator("time")).not.toHaveText("0:00");
    let bytes = 0;
    await page.route("**/api/voice/parse", async (route) => {
      if (route.request().headers()["content-type"].startsWith("audio/")) {
        bytes = route.request().postDataBuffer()?.length ?? 0;
        return route.fulfill({
          status: 422,
          json: { error: ar.voice.missingQuantity("مكتب"), transcript: "مكتب" },
        });
      }
      const { transcript } = route.request().postDataJSON();
      return route.fulfill({
        json: {
          transcript,
          draft: {
            customer: { customerId: null },
            lines: [
              {
                spokenText: "مكتب",
                level: "RED",
                productId: null,
                quantity: 2,
                unmatched: true,
                candidates: [],
              },
            ],
          },
        },
      });
    });
    await page.getByRole("button", { name: ar.voice.stop }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      ar.voice.missingQuantity("مكتب"),
    );
    expect(bytes).toBeGreaterThan(0);
    await expect(page.getByLabel(ar.voice.text)).toBeFocused();
    await expect(page.getByLabel(ar.voice.text)).toHaveValue("مكتب");
    await page.getByLabel(ar.voice.text).fill("مكتب اتنين");
    await page.getByRole("button", { name: ar.voice.parse }).click();
    await expect(
      page.getByRole("heading", { name: ar.notes.summary }),
    ).toBeVisible();
    await page.getByRole("button", { name: ar.voice.add }).click();
    await expect(page.getByLabel(ar.name, { exact: true })).toHaveValue("مكتب");
  } finally {
    await db.auditLog.deleteMany({ where: { userId: keeper.id } });
    await db.user.delete({ where: { id: keeper.id } });
  }
});
