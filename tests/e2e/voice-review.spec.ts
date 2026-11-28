import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { db } from "@/server/db";
import { hashPin } from "@/server/auth";
import { ar } from "@/lib/i18n";
import { fixtureSpeech } from "@/ai/fixture-provider";
const t = ar.notes,
  f = ar.flow;
const viewport =
  process.env.E2E_DESKTOP === "1"
    ? { width: 1440, height: 900 }
    : { width: 360, height: 800 };
test.use({
  viewport,
  permissions: ["microphone"],
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
});
async function record(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).last().click();
  await expect(page.locator("time")).not.toHaveText("0:00");
  await page.getByRole("button", { name: ar.voice.stop }).click();
}
async function setNumber(page: Page, number: string) {
  await page.getByRole("button", { name: t.changeNumber }).click();
  const dialog = page.getByRole("dialog", { name: t.changeNumber });
  await expect(dialog.getByText(t.numberWarning)).toBeVisible();
  await dialog.getByRole("button", { name: t.numberContinue }).click();
  await dialog.getByLabel(t.customNumber).fill(number);
  await dialog.getByRole("button", { name: t.applyNumber }).click();
}
test("mobile keeper reviews speech, resolves matches, corrects and issues a PDF", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const keeper = await db.user.create({
    data: {
      username: "09000000455",
      role: "KEEPER",
      name: "أمين المخزن",
      pinHash: await hashPin("12345"),
    },
  });
  const customer = await db.customer.create({ data: { nameAr: "مينون" } });
  const chair = await db.product.create({ data: { nameAr: "كرسي نوبل" } });
  await db.product.createMany({
    data: [{ nameAr: "فوتيه سيدني" }, { nameAr: "كنبة جولدي" }],
  });
  await page.goto("/login");
  await page.getByLabel(ar.username).fill(keeper.username);
  await page.getByRole("button", { name: ar.loginContinue }).click();
  await page.getByLabel(ar.pin).fill("12345");
  await page.getByRole("button", { name: ar.login }).click();
  const button = (name: string) =>
    page.getByRole("button", { name, exact: true });
  await button(f.skip).click();
  await record(page, ar.voice.start);
  await expect(button(t.summary)).toBeEnabled();
  await expect(button(t.confirm)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: t.preview })).toBeVisible();
  await expect(page.getByText(f.green)).toBeVisible();
  await expect(page.getByLabel(t.remarks, { exact: true })).toHaveValue(
    t.defaultRemarks,
  );
  const screenshot = (state: string) =>
    page.screenshot({
      path: info.outputPath("review-" + state + ".png"),
      style: "nextjs-portal {display:none}",
      scale: "css",
    });
  await screenshot("green");
  const violations = (await new AxeBuilder({ page }).analyze()).violations;
  expect(violations.map((v) => v.id)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    viewport.width,
  );
  await page.getByLabel(t.remarks, { exact: true }).fill("فندق كارما");
  await page.getByRole("checkbox", { name: t.redRemark }).check();
  await button(t.summary).click();
  await setNumber(page, "1300");
  await button(t.confirm).click();
  await expect(page.locator(".pdf-pages canvas")).toBeVisible({
    timeout: 30000,
  });
  expect(
    await db.noteLine.findFirst({
      where: { noteId: page.url().split("/").pop() },
      select: { remarks: true, redRemark: true },
    }),
  ).toEqual({ remarks: "فندق كارما", redRemark: true });
  await expect(
    page.getByRole("heading", { name: ar.notePdf.title + " 1300" }),
  ).toBeVisible();
  await page.getByRole("link", { name: t.newNote }).click();
  await button(f.type).click();
  await page.getByLabel(ar.voice.text).fill(fixtureSpeech.green);
  await button(ar.voice.parse).click();
  await page.getByRole("button", { name: f.editVoice }).click();
  await record(page, f.editVoice);
  await expect(page.getByRole("spinbutton")).toHaveValue("20");
  await button(f.undo).click();
  await expect(page.getByRole("spinbutton")).toHaveValue("2");
  for (const [speech, state] of [
    [fixtureSpeech.yellow, "yellow"],
    [fixtureSpeech.red, "red"],
  ]) {
    await button(f.addVoice).click();
    await button(f.type).click();
    await page.getByLabel(ar.voice.text).fill(speech);
    await button(ar.voice.parse).click();
    await expect(button(t.summary)).toBeDisabled();
    if (state === "yellow") {
      await page
        .locator(".review-line.YELLOW")
        .evaluate((el) => el.scrollIntoView({ block: "start" }));
      await screenshot("yellow");
      await page
        .locator(".review-line.YELLOW")
        .getByRole("button", {
          name: chair.nameAr,
          exact: true,
        })
        .click();
      await expect
        .poll(
          async () =>
            (await db.product.findUniqueOrThrow({ where: { id: chair.id } }))
              .aliases.length,
        )
        .toBe(1);
    } else {
      await page.locator(".review-line.RED").getByRole("spinbutton").fill("3");
      await button(t.saveDraft).click();
      await expect(page.getByText(t.savedOnDevice)).toBeVisible();
      await page.goto("/workspace");
      await page
        .getByRole("region", { name: ar.pwa.waiting })
        .getByRole("button", { name: ar.pwa.review })
        .click();
      await expect(
        page.locator(".review-line.RED").getByRole("spinbutton"),
      ).toHaveValue("3");
      await page
        .locator(".review-line.RED")
        .evaluate((el) => el.scrollIntoView({ block: "start" }));
      await screenshot("red");
      await button(ar.voice.add).click();
      await expect(page.getByLabel(ar.name, { exact: true })).toHaveValue(
        "منضدة مرجان",
      );
      await button(ar.save).click();
      await expect
        .poll(
          async () =>
            await db.product.count({
              where: {
                nameAr: "منضدة مرجان",
                needsReview: true,
                createdByKeeper: true,
              },
            }),
        )
        .toBe(1);
    }
    await expect(button(t.summary)).toBeEnabled();
  }
  await page.getByLabel(t.product).fill("كرسي اختبار جديد");
  await expect(page.getByRole("listbox", { name: t.product })).toContainText(
    t.noProducts,
  );
  await button(t.addNew).click();
  await expect(page.getByLabel(ar.name, { exact: true })).toHaveValue(
    "كرسي اختبار جديد",
  );
  await button(ar.save).click();
  await expect(
    page.getByRole("heading", { name: "4. كرسي اختبار جديد" }),
  ).toBeVisible();
  await button(t.saveDraft).click();
  await expect(page.getByText(ar.saved, { exact: true })).toBeVisible();
  await button(t.saveDraft).click();
  await expect(page.getByText(ar.saved, { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "4. كرسي اختبار جديد" }),
  ).toBeVisible();
  await button(t.summary).click();
  await setNumber(page, "1301");
  await button(t.confirm).click();
  await expect(page.locator(".pdf-pages canvas").first()).toBeVisible({
    timeout: 30000,
  });
  const note = await db.issueNote.findFirstOrThrow({
    where: {
      id: page.url().split("/").pop(),
      createdById: keeper.id,
      status: "CONFIRMED",
    },
  });
  expect(note.number).toBe(1301);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: t.download }).click();
  const task = getDocument({
    data: new Uint8Array(await readFile((await (await download).path())!)),
  });
  const pdf = await task.promise;
  const text = (await (await pdf.getPage(1)).getTextContent()).items
    .map((item) => ("str" in item ? item.str : ""))
    .join(" ");
  expect(text).toContain(String(note.number));
  // The template's embedded Arabic font emits shaped glyphs in visual order.
  const logicalArabic = [...text.normalize("NFKC").replace(/\s/g, "")]
    .reverse()
    .join("");
  expect(logicalArabic).toContain(ar.notePdf.customer + ":" + customer.nameAr);

  await task.destroy();
});
