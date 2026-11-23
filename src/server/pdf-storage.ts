import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { db, type Prisma } from "./db";

export type PdfTarget = { id: string; pdfPath: string | null };
export type StoredPdf = { pdfPath: string | null; byteSize: number };

// A writable PDF_STORAGE_DIR keeps the local Docker setup working. Serverless
// deployments leave it unset and keep the bytes in PostgreSQL.
export function usesFilesystem() {
  return Boolean(process.env.PDF_STORAGE_DIR);
}

export async function savePdf(
  tx: Prisma.TransactionClient,
  noteId: string,
  bytes: Uint8Array,
  path: string,
): Promise<StoredPdf> {
  if (usesFilesystem()) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes, { flag: "wx" });
    return { pdfPath: path, byteSize: bytes.byteLength };
  }
  await tx.pdfDocument.create({
    data: { noteId, bytes: new Uint8Array(bytes), byteSize: bytes.byteLength },
  });
  return { pdfPath: null, byteSize: bytes.byteLength };
}

export async function removePdfFile(path: string) {
  if (!usesFilesystem()) return;
  await rm(path, { force: true });
}

export async function readPdf(note: PdfTarget): Promise<Uint8Array | null> {
  const stored = await db.pdfDocument.findUnique({
    where: { noteId: note.id },
    select: { bytes: true },
  });
  if (stored) return stored.bytes;
  if (!note.pdfPath) return null;
  try {
    return await readFile(note.pdfPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function hasPdf(note: {
  pdfPath?: string | null;
  pdf?: { byteSize: number } | null;
}) {
  return Boolean(note.pdfPath || note.pdf);
}
