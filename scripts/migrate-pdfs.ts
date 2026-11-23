import "dotenv/config";
import { readFile, stat } from "node:fs/promises";
import { db } from "../src/server/db";

// Copy PDFs from the local PDF_STORAGE_DIR into PostgreSQL before switching a
// production database to the serverless storage driver. Safe to rerun.
const dryRun = process.argv.includes("--dry-run");
const notes = await db.issueNote.findMany({
  where: { pdfPath: { not: null }, pdf: null },
  select: { id: true, number: true, pdfPath: true },
});
let copied = 0;
let missing = 0;
for (const note of notes) {
  try {
    const info = await stat(note.pdfPath!);
    if (!info.isFile()) throw Object.assign(Error("not a file"), { code: "ENOENT" });
    if (!dryRun) {
      const bytes = await readFile(note.pdfPath!);
      await db.pdfDocument.create({
        data: { noteId: note.id, bytes, byteSize: bytes.byteLength },
      });
    }
    copied++;
    console.log(
      (dryRun ? "would copy " : "copied ") +
        "note " +
        note.number +
        " (" +
        info.size +
        " bytes)",
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    missing++;
    console.warn("missing file for note " + note.number + ": " + note.pdfPath);
  }
}
console.log(
  (dryRun ? "Dry run: " : "") +
    copied +
    " PDF(s) copied, " +
    missing +
    " missing.",
);
await db.$disconnect();
if (missing) process.exitCode = 1;
