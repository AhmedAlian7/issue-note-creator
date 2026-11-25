import { expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { db } from "@/server/db";
import {
  createDraft,
  updateDraft,
  confirmNote,
  supersedeNote,
  voidNote,
  duplicateNote,
  listNotes,
  getNote,
  archiveStatus,
  NoteConflict,
} from "@/server/notes";
import { renderNotePdf } from "@/pdf/render-note-pdf";
import { Denied } from "@/server/permissions";
import { NoteNumberTaken } from "@/server/counter";
vi.mock("@/pdf/render-note-pdf", () => ({
  renderNotePdf: vi.fn(async () => Buffer.from("%PDF-test")),
}));
it("rolls back failed issuance and serializes twenty full confirmations", async () => {
  const keeper = await db.user.create({
    data: {
      name: "test",
      username: "09000000000",
      pinHash: "unused",
      role: "KEEPER",
    },
  });
  const admin = await db.user.create({
    data: {
      name: "admin",
      username: "09000000001",
      pinHash: "unused",
      role: "ADMIN",
    },
  });
  const customer = await db.customer.create({ data: { nameAr: "عميل" } });
  const product = await db.product.create({ data: { nameAr: "صنف" } });
  const fields = {
    customerId: customer.id,
    lines: [{ productId: product.id, quantity: 2 }],
  };
  const drafts = await Promise.all(
    Array.from({ length: 20 }, () => createDraft(keeper, fields)),
  );
  const key = drafts[0].id;
  const counter = () => db.noteCounter.findUniqueOrThrow({ where: { id: 1 } });
  const start = await counter();
  await expect(
    confirmNote(keeper, key, "2000-01-01T00:00:00.000Z"),
  ).rejects.toBeInstanceOf(NoteConflict);
  vi.mocked(renderNotePdf).mockRejectedValueOnce(Error("render failed"));
  await expect(confirmNote(keeper, key)).rejects.toThrow("render failed");
  expect(await counter()).toEqual(start);
  expect(await getNote(keeper, key)).toMatchObject({
    status: "DRAFT",
    pdfPath: null,
    number: null,
  });
  const issued = await Promise.all(
    drafts.map((note) => confirmNote(keeper, note.id)),
  );
  expect(issued.map((n) => n.number!).sort((a, b) => a - b)).toEqual(
    Array.from({ length: 20 }, (_, i) => (start.nextNumber ?? 973) + i),
  );
  expect(await readFile(issued[0].pdfPath!, "utf8")).toBe("%PDF-test");
  const persisted = await db.issueNote.findUniqueOrThrow({
    where: { id: issued[0].id },
  });
  expect(persisted.pdfPath).toBe(issued[0].pdfPath);
  expect(renderNotePdf).toHaveBeenCalledWith(
    expect.objectContaining({
      number: issued[0].number,
      customerName: customer.nameAr,
    }),
  );
  expect(issued[0].date.toISOString().slice(0, 10)).toBe(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(
      new Date(),
    ),
  );
  await expect(updateDraft(keeper, key, fields)).rejects.toBeInstanceOf(
    NoteConflict,
  );
  await expect(confirmNote(keeper, key)).rejects.toBeInstanceOf(NoteConflict);
  await expect(voidNote(keeper, key, "خطأ")).rejects.toBeInstanceOf(Denied);
  await expect(
    supersedeNote(keeper, key, fields, "خطأ"),
  ).rejects.toBeInstanceOf(Denied);
  const before = await counter();
  const revision = await supersedeNote(admin, key, fields, "تصحيح");
  expect(revision).toMatchObject({
    number: issued[0].number,
    version: 2,
    supersedesId: key,
    status: "CONFIRMED",
  });
  expect(await counter()).toEqual(before);
  expect(archiveStatus(await getNote(admin, key))).toBe("SUPERSEDED");
  expect(
    (
      await listNotes(admin, {
        status: "CONFIRMED",
        q: String(revision.number),
        productId: product.id,
      })
    ).map((n) => n.id),
  ).toEqual([revision.id]);
  await expect(getNote(keeper, revision.id)).rejects.toMatchObject({
    code: "P2025",
  });
  expect(
    (await listNotes(admin, { status: "SUPERSEDED" })).map((n) => n.id),
  ).toContain(key);
  await expect(voidNote(admin, key, "خطأ")).rejects.toBeInstanceOf(
    NoteConflict,
  );
  await expect(voidNote(admin, revision.id, " ")).rejects.toThrow();
  expect(await voidNote(admin, revision.id, "خطأ")).toMatchObject({
    status: "VOIDED",
    voidReason: "خطأ",
  });
  expect(await duplicateNote(keeper, key)).toMatchObject({
    number: null,
    status: "DRAFT",
    version: 1,
  });

  const requested = (await counter()).nextNumber!;
  const [first, second] = await Promise.all([
    createDraft(keeper, fields),
    createDraft(keeper, fields),
  ]);
  const attempts = await Promise.allSettled(
    [first, second].map((draft) =>
      confirmNote(keeper, draft.id, undefined, requested),
    ),
  );
  const failedIndex = attempts.findIndex(
    (attempt) => attempt.status === "rejected",
  );
  expect(
    attempts.filter((attempt) => attempt.status === "fulfilled"),
  ).toHaveLength(1);
  expect(attempts[failedIndex]).toMatchObject({
    status: "rejected",
    reason: expect.any(NoteNumberTaken),
  });
  expect((await counter()).nextNumber).toBe(requested);
  const pending = [first, second][failedIndex];
  expect(await getNote(keeper, pending.id)).toMatchObject({ status: "DRAFT" });
  expect(await confirmNote(keeper, pending.id)).toMatchObject({
    number: requested + 1,
  });
}, 120000);
