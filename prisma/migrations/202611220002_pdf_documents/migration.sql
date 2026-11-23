-- Store issued PDFs in PostgreSQL so serverless deployments keep every file
-- without a writable filesystem or a separate object-storage account.
CREATE TABLE "PdfDocument" (
  "noteId" TEXT NOT NULL,
  "bytes" BYTEA NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PdfDocument_pkey" PRIMARY KEY ("noteId")
);

ALTER TABLE "PdfDocument"
  ADD CONSTRAINT "PdfDocument_noteId_fkey"
  FOREIGN KEY ("noteId") REFERENCES "IssueNote"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
