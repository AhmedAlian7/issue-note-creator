DROP INDEX "IssueNote_number_key";
CREATE UNIQUE INDEX "IssueNote_number_version_key" ON "IssueNote"("number", "version");
