CREATE TABLE "ReportLog" (
 "type" TEXT NOT NULL, "period" TEXT NOT NULL, "sentAt" TIMESTAMP(3),
 "status" TEXT NOT NULL, "error" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("type","period")
);
CREATE INDEX "ReportLog_status_updatedAt_idx" ON "ReportLog" ("status","updatedAt");
