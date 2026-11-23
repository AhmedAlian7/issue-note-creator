import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { draftTimestamp, id, noteInput, reasonInput } from "@/lib/inputs";
import { filters } from "@/lib/note-filters";
import { renderNotePdf } from "@/pdf/render-note-pdf";
import { db, type Prisma } from "../db";
import { company } from "@/lib/report-config";
import { allocateNumber } from "../counter";
import { audit } from "../audit";
import { authorize, type Actor } from "../permissions";
import { removePdfFile, savePdf } from "../pdf-storage";

type Tx = Prisma.TransactionClient;
const detail = {
  customer: true,
  successor: { select: { status: true } },
  lines: { orderBy: { position: "asc" }, include: { product: true } },
  pdf: { select: { byteSize: true } },
} as const;
type Note = Prisma.IssueNoteGetPayload<{ include: typeof detail }>;
export class NoteConflict extends Error {}
const cairo = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Cairo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const today = () => new Date(cairo.format(new Date()) + "T00:00:00Z");
const scope = (actor: Actor) =>
  actor.role === "KEEPER" ? { createdById: actor.id } : {};
export function archiveStatus(note: Pick<Note, "status" | "successor">) {
  return note.status === "CONFIRMED" &&
    note.successor &&
    note.successor.status !== "DRAFT"
    ? "SUPERSEDED"
    : note.status;
}
async function find(tx: Tx, actor: Actor, key: string, lock = false) {
  const noteId = id.parse(key);
  if (lock)
    await tx.$queryRaw`SELECT id FROM "IssueNote" WHERE id=${noteId} FOR UPDATE`;
  return tx.issueNote.findFirstOrThrow({
    where: { id: noteId, ...scope(actor) },
    include: detail,
  });
}
function fields(input: unknown) {
  const data = noteInput.parse(input);
  return {
    customerId: data.customerId,
    lines: {
      create: data.lines.map((line, position) => ({ ...line, position })),
    },
  };
}
async function draft(tx: Tx, actor: Actor, input: unknown, previous?: Note) {
  return tx.issueNote.create({
    data: {
      ...fields(input),
      createdById: actor.id,
      date: today(),
      supersedesId: previous?.id,
      version: (previous?.version ?? 0) + 1,
    },
    include: detail,
  });
}
export async function createDraft(actor: Actor, input: unknown) {
  authorize(actor, "note.create");
  return db.$transaction(async (tx) => {
    const note = await draft(tx, actor, input);
    await audit(tx, actor.id, "create", "IssueNote", note.id, undefined, note);
    return note;
  });
}
export async function duplicateNote(actor: Actor, key: string) {
  authorize(actor, "note.create");
  return db.$transaction(async (tx) => {
    const source = await find(tx, actor, key, true);
    const note = await draft(tx, actor, source);
    await audit(
      tx,
      actor.id,
      "duplicate",
      "IssueNote",
      note.id,
      { sourceId: source.id },
      note,
    );
    return note;
  });
}
function requireCurrentDraft(note: Note, expected?: string) {
  const timestamp = draftTimestamp.parse(expected);
  if (
    note.status !== "DRAFT" ||
    (timestamp && timestamp !== note.updatedAt.toISOString())
  )
    throw new NoteConflict();
}
export async function updateDraft(
  actor: Actor,
  key: string,
  input: unknown,
  expected?: string,
) {
  authorize(actor, "note.edit");
  const data = fields(input);
  return db.$transaction(async (tx) => {
    const before = await find(tx, actor, key, true);
    requireCurrentDraft(before, expected);
    const note = await tx.issueNote.update({
      where: { id: key },
      data: { ...data, lines: { deleteMany: {}, ...data.lines } },
      include: detail,
    });
    await audit(tx, actor.id, "edit", "IssueNote", key, before, note);
    return note;
  });
}
// A unique file per attempt keeps a failed transaction from removing another issuer's PDF.
async function issueTransaction(
  work: (tx: Tx, pdfPath: string) => Promise<Note>,
) {
  const path = resolve(
    process.env.PDF_STORAGE_DIR || "/data/pdfs",
    randomUUID() + ".pdf",
  );
  try {
    return await db.$transaction((tx) => work(tx, path), {
      maxWait: 180000,
      timeout: 180000,
    });
  } catch (error) {
    await removePdfFile(path);
    throw error;
  }
}
async function issue(tx: Tx, note: Note, number: number, pdfPath: string) {
  if (!note.lines.length) throw new NoteConflict();
  const date = today();
  const pdf = await renderNotePdf({
    company: company.safeParse(
      (await tx.setting.findUnique({ where: { key: "company" } }))?.value,
    ).data,
    number,
    date: date.toISOString().slice(0, 10).split("-").reverse().join("/"),
    customerName: note.customer.nameAr,
    lines: note.lines.map((line) => ({
      ...line,
      productName: line.product.nameAr,
    })),
  });
  const stored = await savePdf(tx, note.id, pdf, pdfPath);
  const confirmed = await tx.issueNote.update({
    where: { id: note.id },
    data: { status: "CONFIRMED", date, number, pdfPath: stored.pdfPath },
    include: detail,
  });
  return { ...confirmed, pdf: { byteSize: stored.byteSize } };
}
export async function confirmNote(
  actor: Actor,
  key: string,
  expected?: string,
) {
  authorize(actor, "note.confirm");
  return issueTransaction(async (tx, pdfPath) => {
    const before = await find(tx, actor, key, true);
    requireCurrentDraft(before, expected);
    const prior = before.supersedesId
      ? await find(tx, actor, before.supersedesId, true)
      : null;
    if (prior && prior.status !== "CONFIRMED") throw new NoteConflict();
    const note = await issue(
      tx,
      before,
      prior?.number ?? (await allocateNumber(tx)),
      pdfPath,
    );
    await audit(tx, actor.id, "confirm", "IssueNote", key, before, note);
    return note;
  });
}
export async function supersedeNote(
  actor: Actor,
  key: string,
  input: unknown,
  reason: string,
) {
  authorize(actor, "note.supersede");
  const why = reasonInput.parse(reason);
  return issueTransaction(async (tx, pdfPath) => {
    const before = await find(tx, actor, key, true);
    if (before.status !== "CONFIRMED" || !before.number || before.successor)
      throw new NoteConflict();
    const revision = await draft(tx, actor, input, before);
    const note = await issue(tx, revision, before.number, pdfPath);
    await audit(tx, actor.id, "supersede", "IssueNote", note.id, before, {
      ...note,
      reason: why,
    });
    return note;
  });
}
export async function voidNote(actor: Actor, key: string, reason: string) {
  authorize(actor, "note.void");
  const voidReason = reasonInput.parse(reason);
  return db.$transaction(async (tx) => {
    const before = await find(tx, actor, key, true);
    if (before.status !== "CONFIRMED" || before.successor)
      throw new NoteConflict();
    const note = await tx.issueNote.update({
      where: { id: key },
      data: { status: "VOIDED", voidReason },
      include: detail,
    });
    await audit(tx, actor.id, "void", "IssueNote", key, before, note);
    return note;
  });
}
export async function getNote(actor: Actor, key: string) {
  authorize(actor, "note.read");
  return db.$transaction(async (tx) => {
    const note = await find(tx, actor, key);
    await audit(tx, actor.id, "read", "IssueNote", key);
    return note;
  });
}
export async function listNotes(actor: Actor, input: unknown = {}) {
  authorize(actor, "note.read");
  const f = filters.parse(input);
  const number = Number(
    f.q?.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632)),
  );
  const issuedSuccessor = { is: { status: { not: "DRAFT" as const } } };
  return db.$transaction(async (tx) => {
    const rows = await tx.issueNote.findMany({
      where: {
        ...scope(actor),
        status: f.status === "SUPERSEDED" ? "CONFIRMED" : f.status,
        ...(f.status === "SUPERSEDED"
          ? { successor: issuedSuccessor }
          : f.status === "CONFIRMED"
            ? { NOT: { successor: issuedSuccessor } }
            : {}),
        date: {
          gte: f.from ? new Date(f.from) : undefined,
          lte: f.to ? new Date(f.to) : undefined,
        },
        lines: f.productId ? { some: { productId: f.productId } } : undefined,
        OR: f.q
          ? [
              { customer: { nameAr: { contains: f.q, mode: "insensitive" } } },
              ...(Number.isInteger(number) && number > 0 && number <= 2147483647
                ? [{ number }]
                : []),
            ]
          : undefined,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        customer: true,
        successor: { select: { status: true } },
        _count: { select: { lines: true } },
        pdf: { select: { byteSize: true } },
      },
    });
    await audit(tx, actor.id, "list", "IssueNote", "archive", undefined, f);
    return rows;
  });
}
export async function noteCatalog(actor: Actor) {
  authorize(actor, "note.read");
  const [customers, products] = await Promise.all([
    db.customer.findMany({
      orderBy: { nameAr: "asc" },
      select: { id: true, nameAr: true, active: true },
    }),
    db.product.findMany({
      orderBy: { nameAr: "asc" },
      select: { id: true, nameAr: true, aliases: true, active: true },
    }),
  ]);
  return { customers, products };
}
export async function recentNotes(actor: Actor) {
  authorize(actor, "note.read");
  return db.$transaction(async (tx) => {
    const where = { createdById: actor.id };
    const rows = await tx.issueNote.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 10,
      include: {
        customer: true,
        successor: { select: { status: true } },
        _count: { select: { lines: true } },
        pdf: { select: { byteSize: true } },
      },
    });
    const customers = await tx.$queryRaw<{ id: string; nameAr: string }[]>`
      SELECT c.id, c."nameAr" FROM "IssueNote" n JOIN "Customer" c ON c.id=n."customerId"
      WHERE n."createdById"=${actor.id} AND c.active GROUP BY c.id
      ORDER BY max(n."updatedAt") DESC, c.id LIMIT 4`;
    await audit(tx, actor.id, "recent", "IssueNote", "workspace");
    return { rows, customers };
  });
}
