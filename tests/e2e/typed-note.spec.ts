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
  const phone = "09000000002";
  await db.user.create({
    data: {
      phone,
      name: "أمين",
      role: "KEEPER",
      pinHash: await hashPin("12345"),
    },
  });
  const customer = await db.customer.create({
    data: { nameAr: "فندق الاختبار" },
  });
  const product = await db.product.create({ data: { nameAr: "أَرِيكَة" } });
  const expected =
    (await db.noteCounter.findUniqueOrThrow({ where: { id: 1 } })).nextNumber ??
    973;
  await page.goto("/login");
  await page.getByLabel(ar.phone).fill(phone);
  await page.getByLabel(ar.pin).fill("12345");
  await page.getByRole("button", { name: ar.login }).click();
  await page.getByRole("link", { name: t.newNote }).click();
  await page
    .getByRole("combobox", { name: t.customer, exact: true })
    .selectOption(customer.id);
  await page.getByLabel(t.product).fill("اريكه");
  await page.getByRole("button", { name: product.nameAr }).click();
  await page.getByRole("spinbutton").fill("4");
  await page.getByLabel(t.remarks, { exact: true }).fill("المدخل");
  await page.getByLabel(t.destination, { exact: true }).check();
  await expect(page.getByRole("status")).toHaveText(ar.saved);
  await page.reload();
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
  await page.getByRole("button", { name: t.confirm }).click();
  await expect(
    page.getByRole("heading", { name: ar.notePdf.title + " " + expected }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".pdf-pages canvas")).toBeVisible({
    timeout: 30000,
  });
  const downloaded = page.waitForEvent("download");
  await page.getByRole("link", { name: t.download }).click();
  const pdf = await downloaded;
  expect(pdf.suggestedFilename()).toBe("note-" + expected + "-v1.pdf");
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
  await page.getByRole("link", { name: t.archive }).click();
  await page.getByLabel(t.search).fill(String(expected));
  await page.getByRole("button", { name: ar.search }).click();
  await expect(
    page.getByRole("link", { name: new RegExp(customer.nameAr) }),
  ).toBeVisible();
});
