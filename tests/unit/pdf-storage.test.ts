import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { db } from "@/server/db";
import {
  hasPdf,
  readPdf,
  savePdf,
  usesFilesystem,
} from "@/server/pdf-storage";

async function draft(phone: string) {
  const user = await db.user.create({
    data: { name: "storage", phone, pinHash: "unused", role: "ADMIN" },
  });
  const customer = await db.customer.create({ data: { nameAr: "عميل" } });
  return db.issueNote.create({
    data: { customerId: customer.id, createdById: user.id, date: new Date() },
  });
}

it("stores issued PDFs in PostgreSQL when no filesystem directory is configured", async () => {
  const original = process.env.PDF_STORAGE_DIR;
  delete process.env.PDF_STORAGE_DIR;
  const note = await draft("09111111111");
  try {
    expect(usesFilesystem()).toBe(false);
    await db.$transaction((tx) =>
      savePdf(tx, note.id, new Uint8Array([37, 80, 68, 70]), "/unused.pdf"),
    );
    const bytes = await readPdf(note);
    expect(Buffer.from(bytes!).toString()).toBe("%PDF");
    expect(hasPdf({ pdfPath: null, pdf: { byteSize: 4 } })).toBe(true);
    expect(hasPdf({ pdfPath: null, pdf: null })).toBe(false);
  } finally {
    if (original === undefined) delete process.env.PDF_STORAGE_DIR;
    else process.env.PDF_STORAGE_DIR = original;
  }
});

it("keeps the filesystem driver for local Docker development", async () => {
  const original = process.env.PDF_STORAGE_DIR;
  const dir = await mkdtemp(join(tmpdir(), "pdf-storage-"));
  process.env.PDF_STORAGE_DIR = dir;
  const note = await draft("09222222222");
  try {
    expect(usesFilesystem()).toBe(true);
    const path = join(dir, "note.pdf");
    const stored = await db.$transaction((tx) =>
      savePdf(tx, note.id, new Uint8Array([37, 80, 68, 70]), path),
    );
    expect(stored.pdfPath).toBe(path);
    expect(
      Buffer.from((await readPdf({ ...note, pdfPath: path }))!).toString(),
    ).toBe("%PDF");
  } finally {
    if (original === undefined) delete process.env.PDF_STORAGE_DIR;
    else process.env.PDF_STORAGE_DIR = original;
    await rm(dir, { recursive: true, force: true });
  }
});
