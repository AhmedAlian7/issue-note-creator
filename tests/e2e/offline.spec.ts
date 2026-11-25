import { fixtureSpeech } from "@/ai/fixture-provider";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ar } from "@/lib/i18n";
import { db } from "@/server/db";
import { hashPin } from "@/server/auth";

test.use({
  permissions: ["microphone"],
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
});

test("queues voice and text through an offline reload and processes them on reconnect", async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  const keeper = await db.user.create({
    data: {
      name: "أمين",
      username: "offline-" + randomUUID(),
      pinHash: await hashPin("01234"),
      role: "KEEPER",
    },
  });
  await page.goto("/login");
  await page.getByLabel(ar.username).fill(keeper.username);
  await page.getByRole("button", { name: ar.loginContinue }).click();
  await page.getByLabel(ar.pin).fill("01234");
  await page.getByRole("button", { name: ar.login }).click();
  await page.getByRole("button", { name: ar.flow.skip }).click();
  await expect
    .poll(() =>
      page.evaluate(async () => navigator.serviceWorker.controller?.state),
    )
    .toBe("activated");

  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest).toMatchObject({
    lang: "ar-EG",
    dir: "rtl",
    display: "standalone",
    start_url: "/workspace",
  });
  for (const icon of manifest.icons)
    expect((await page.request.get(icon.src)).ok()).toBeTruthy();

  const inspector = await context.newCDPSession(page);
  const { installabilityErrors } = await inspector.send(
    "Page.getInstallabilityErrors",
  );
  expect(installabilityErrors).toEqual([]);
  await inspector.detach();

  await context.setOffline(true);
  await expect(page.getByText(ar.pwa.offline)).toBeVisible();
  await page.getByRole("button", { name: ar.flow.type }).click();
  await page.getByLabel(ar.voice.text).fill(fixtureSpeech.yellow);
  await page.getByRole("button", { name: ar.pwa.save }).click();
  let waiting = page.getByRole("region", { name: ar.pwa.waiting });
  await expect(waiting.getByRole("listitem")).toHaveCount(1);

  await page.reload();
  await expect(page.getByText(ar.pwa.offline)).toBeVisible();
  waiting = page.getByRole("region", { name: ar.pwa.waiting });
  await expect(
    waiting.getByText(fixtureSpeech.yellow, { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: ar.voice.start }).click();
  await expect(page.locator("time")).not.toHaveText("0:00");
  await page.getByRole("button", { name: ar.voice.stop }).click();
  await expect(waiting.getByRole("listitem")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: ar.notes.confirm }),
  ).toHaveCount(0);

  const replayStatuses: number[] = [];
  page.on("response", (response) => {
    if (response.url().endsWith("/api/voice/parse"))
      replayStatuses.push(response.status());
  });
  await context.setOffline(false);
  await expect
    .poll(() => replayStatuses.slice(0, 2), { timeout: 45_000 })
    .toEqual([200, 200]);
  await expect(
    waiting.getByRole("button", { name: ar.pwa.review }),
  ).toHaveCount(2, { timeout: 60_000 });
  await waiting.getByRole("button", { name: ar.pwa.review }).first().click();
  await expect(
    page.getByRole("heading", { name: ar.notes.summary }),
  ).toBeVisible();
  expect(await db.recording.count({ where: { createdById: keeper.id } })).toBe(
    2,
  );
  expect(await db.issueNote.count({ where: { createdById: keeper.id } })).toBe(
    0,
  );
});
