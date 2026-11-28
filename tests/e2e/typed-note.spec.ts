import "dotenv/config";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { db } from "@/server/db";
import { hashPin } from "@/server/auth";
import { ar } from "@/lib/i18n";
const t = ar.notes;
test("keeper types, issues, previews and downloads the numbered PDF on a phone", async ({
  page,
}) => {
  test.setTimeout(120000);
  const username = "09000000002";
  await db.user.create({
    data: {
      username,
      name: "أمين",
      role: "KEEPER",
      pinHash: await hashPin("12345"),
    },
  });
  const customer = await db.customer.create({
    data: { nameAr: "فندق الاختبار" },
  });
  const product = await db.product.create({ data: { nameAr: "أَرِيكَة" } });
  const otherProduct = await db.product.create({ data: { nameAr: "منضدة" } });
  await page.goto("/login");
  await page.getByLabel(ar.username).fill(username);
  await page.getByRole("button", { name: ar.loginContinue }).click();
  await page.getByLabel(ar.pin).fill("12345");
  await page.getByRole("button", { name: ar.login }).click();
  await page.getByRole("button", { name: ar.flow.skip }).click();
  await page.getByRole("link", { name: t.newNote }).click();
  await page
    .getByRole("combobox", { name: t.customer, exact: true })
    .selectOption(customer.id);
  const picker = page.getByRole("combobox", { name: t.product });
  const options = page.getByRole("listbox", { name: t.product });
  await expect(options).toHaveCount(0);
  await picker.click();
  await expect(
    options.getByRole("option", { name: otherProduct.nameAr }),
  ).toBeVisible();
  await picker.fill("اريكه");
  await expect(options.getByRole("option")).toHaveCount(1);
  await expect(
    options.getByRole("option", { name: product.nameAr }),
  ).toBeVisible();
  await picker.press("Escape");
  await expect(picker).toHaveAttribute("aria-expanded", "false");
  await picker.press("ArrowDown");
  await expect(options.getByRole("option", { selected: true })).toHaveText(
    product.nameAr,
  );
  await picker.press("Enter");
  await expect(options).toHaveCount(0);
  await page
    .locator(".line-card")
    .getByRole("button", { name: ar.edit })
    .click();
  await options.getByRole("option", { name: product.nameAr }).click();
  await expect(options).toHaveCount(0);
  await page.getByRole("spinbutton").fill("4");
  const remarks = page.getByLabel(t.remarks, { exact: true });
  const redRemark = page.getByRole("checkbox", { name: t.redRemark });
  await expect(remarks).toHaveValue("استندر");
  await expect(redRemark).toHaveCount(0);
  await remarks.fill("المدخل");
  await redRemark.check();
  await remarks.fill("استندر");
  await expect(redRemark).toHaveCount(0);
  await remarks.fill("المدخل");
  await expect(redRemark).not.toBeChecked();
  await redRemark.check();
  await expect(page.getByRole("status")).toHaveText(ar.saved);
  await page.reload();
  await expect(remarks).toHaveValue("المدخل");
  await expect(redRemark).toBeChecked();
  await expect(page.getByRole("spinbutton")).toHaveValue("4");
  // A partial match must still allow the keeper to register a distinct product.
  await page.getByLabel(t.product).fill("أري");
  await page.getByRole("button", { name: t.addNew }).click();
  const newName = page.getByRole("textbox", { name: ar.name, exact: true });
  await expect(newName).toHaveValue("أري");
  await newName.fill("أريكة صغيرة");
  await page.getByRole("button", { name: ar.save, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "2. أريكة صغيرة" }),
  ).toBeVisible();
  expect(
    await db.product.findFirstOrThrow({ where: { nameAr: "أريكة صغيرة" } }),
  ).toMatchObject({ needsReview: true, createdByKeeper: true });
  await page.getByRole("button", { name: t.summary }).click();
  const changeNumber = page.getByRole("button", { name: t.changeNumber });
  await changeNumber.click();
  const numberDialog = page.getByRole("dialog", { name: t.changeNumber });
  const customNumber = numberDialog.getByLabel(t.customNumber);
  await expect(numberDialog.getByText(t.numberWarning)).toBeVisible();
  await expect(customNumber).toHaveCount(0);
  await numberDialog.getByRole("button", { name: t.cancel }).click();
  await expect(page.getByText(t.numberPending)).toBeVisible();
  await changeNumber.click();
  await numberDialog.getByRole("button", { name: t.numberContinue }).click();
  await customNumber.fill("٠");
  const applyNumber = numberDialog.getByRole("button", { name: t.applyNumber });
  await expect(applyNumber).toBeDisabled();
  await customNumber.fill("١٢٠٠");
  await applyNumber.click();
  await page.getByRole("button", { name: t.confirm }).click();
  await expect(page.locator(".issued")).toBeVisible({ timeout: 30000 });
  const expected = (
    await db.issueNote.findFirstOrThrow({
      where: { customerId: customer.id, status: "CONFIRMED" },
    })
  ).number!;
  expect(expected).toBe(1200);
  await expect(
    page.getByRole("heading", { name: ar.notePdf.title + " " + expected }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".pdf-pages canvas")).toBeVisible({
    timeout: 30000,
  });
  const downloaded = page.waitForEvent("download");
  await page.getByRole("link", { name: t.download }).click();
  const pdf = await downloaded;
  expect(pdf.suggestedFilename()).toBe(
    `منصرف مخزن (${expected}) - ${customer.nameAr}.pdf`,
  );
  expect(
    (
      await PDFDocument.load(await readFile((await pdf.path())!))
    ).getPageCount(),
  ).toBe(1);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => false,
    }),
  );
  const fallback = page.waitForEvent("download");
  await page.getByRole("button", { name: t.share }).click();
  expect((await fallback).suggestedFilename()).toBe(pdf.suggestedFilename());
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async ({ files }: ShareData) => {
        document.body.dataset.shared = files?.[0]?.name;
      },
    });
    window.print = () => {
      document.body.dataset.printed = "true";
    };
  });
  await page.getByRole("button", { name: t.share }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-shared",
    pdf.suggestedFilename(),
  );
  await page.getByRole("button", { name: t.print }).click();
  await expect(page.locator("body")).toHaveAttribute("data-printed", "true");
  await page.getByRole("main").getByRole("link", { name: t.archive }).click();
  await page.getByLabel(t.search).fill(String(expected));
  await page.getByRole("button", { name: ar.search }).click();
  await expect(
    page.getByRole("link", { name: new RegExp(customer.nameAr) }),
  ).toBeVisible();
  await page.getByRole("link", { name: new RegExp(customer.nameAr) }).click();
  await expect(page).toHaveURL(/\/notes\/[a-f0-9-]+$/);
  const originalUrl = page.url();
  await expect(page.getByRole("button", { name: t.void })).toHaveCount(0);
  await page.getByRole("link", { name: t.editConfirmed }).click();
  await page.getByRole("spinbutton").first().fill("6");
  await page.getByRole("button", { name: t.summary }).click();
  await expect(page.getByRole("button", { name: t.supersede })).toBeDisabled();
  await page.getByLabel(t.reason).fill("تصحيح الكمية");
  await page.getByRole("button", { name: t.supersede }).click();
  await expect(page.locator(".pdf-pages canvas")).toBeVisible({
    timeout: 30000,
  });
  expect(page.url()).not.toBe(originalUrl);
  const revision = await db.issueNote.findUniqueOrThrow({
    where: { id: page.url().split("/").pop() },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  expect(revision).toMatchObject({
    number: expected,
    version: 2,
    supersedesId: originalUrl.split("/").pop(),
    lines: [expect.objectContaining({ quantity: 6 }), expect.anything()],
  });
  await page.goto(originalUrl);
  await expect(page.getByText(new RegExp(t.SUPERSEDED))).toBeVisible();
  await expect(page.getByRole("link", { name: t.editConfirmed })).toHaveCount(
    0,
  );
});
