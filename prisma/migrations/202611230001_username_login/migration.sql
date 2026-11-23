BEGIN;

ALTER TABLE "User" RENAME COLUMN "phone" TO "username";
ALTER INDEX "User_phone_key" RENAME TO "User_username_key";
ALTER TABLE "User" ALTER COLUMN "pinHash" DROP NOT NULL;

DELETE FROM "Session"
WHERE "userId" IN (
  SELECT "id" FROM "User" WHERE "username" IN ('01000000973', '01000000974', '01000000975')
);

UPDATE "User" AS u
SET "username" = accounts.username, "name" = accounts.name, "pinHash" = NULL
FROM (VALUES
  ('01000000973', 'ayman', 'Ayman'),
  ('01000000974', 'ahmed', 'Ahmed'),
  ('01000000975', 'mahmoud', 'محمود الدسوقي- أمين مخزن')
) AS accounts(previous, username, name)
WHERE u."username" = accounts.previous
  AND EXISTS (
    SELECT 1 FROM "AuditLog" a
    WHERE a."entityId" = u."id"::text AND a."action" = 'seed.create' AND a."entity" = 'User'
  );

COMMIT;
