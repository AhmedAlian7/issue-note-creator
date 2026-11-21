-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'KEEPER', 'OWNER');

-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'VOIDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByKeeper" BOOLEAN NOT NULL DEFAULT false,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultDestination" TEXT,
    "whatsappGroupName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueNote" (
    "id" TEXT NOT NULL,
    "number" INTEGER,
    "date" DATE NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "NoteStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersedesId" TEXT,
    "createdById" TEXT NOT NULL,
    "pdfPath" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteLine" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remarks" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "NoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL,
    "noteId" TEXT,
    "transcript" TEXT NOT NULL,
    "parsedJson" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "NoteCounter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nextNumber" INTEGER,

    CONSTRAINT "NoteCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "IssueNote_number_key" ON "IssueNote"("number");

-- CreateIndex
CREATE UNIQUE INDEX "IssueNote_supersedesId_key" ON "IssueNote"("supersedesId");

-- CreateIndex
CREATE UNIQUE INDEX "NoteLine_noteId_position_key" ON "NoteLine"("noteId", "position");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- AddForeignKey
ALTER TABLE "IssueNote" ADD CONSTRAINT "IssueNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueNote" ADD CONSTRAINT "IssueNote_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "IssueNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueNote" ADD CONSTRAINT "IssueNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteLine" ADD CONSTRAINT "NoteLine_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "IssueNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteLine" ADD CONSTRAINT "NoteLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "IssueNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Customer" ADD COLUMN "needsReview" boolean NOT NULL DEFAULT false;
ALTER TABLE "NoteCounter" ADD CHECK (id = 1 AND ("nextNumber" IS NULL OR "nextNumber" > 0));
INSERT INTO "NoteCounter" (id) VALUES (1);
ALTER TABLE "NoteLine" ADD CHECK (quantity > 0);
ALTER TABLE "IssueNote" ADD CHECK (
  ((status = 'DRAFT') = (number IS NULL)) AND
  ((status = 'VOIDED' AND length(trim("voidReason")) > 0 AND "voidReason" IS NOT NULL)
    OR (status <> 'VOIDED' AND "voidReason" IS NULL))
);

CREATE FUNCTION protect_issued_note() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'DRAFT' THEN
    IF TG_OP = 'UPDATE' AND OLD.status = 'CONFIRMED' AND NEW.status = 'VOIDED'
       AND (to_jsonb(NEW) - ARRAY['status','voidReason','updatedAt']) =
           (to_jsonb(OLD) - ARRAY['status','voidReason','updatedAt']) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Issued note is locked';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_issued BEFORE UPDATE OR DELETE ON "IssueNote"
FOR EACH ROW EXECUTE FUNCTION protect_issued_note();

CREATE FUNCTION protect_issued_line() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    IF (SELECT status FROM "IssueNote" WHERE id = OLD."noteId" FOR UPDATE) <> 'DRAFT' THEN
      RAISE EXCEPTION 'Issued line is locked';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF (SELECT status FROM "IssueNote" WHERE id = NEW."noteId" FOR UPDATE) <> 'DRAFT' THEN
    RAISE EXCEPTION 'Issued line is locked';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_line BEFORE INSERT OR UPDATE OR DELETE ON "NoteLine"
FOR EACH ROW EXECUTE FUNCTION protect_issued_line();
