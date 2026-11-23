BEGIN;

ALTER TABLE "NoteLine" DROP COLUMN "isDestination";

UPDATE "Recording"
SET "parsedJson" = jsonb_set("parsedJson", '{lines}', (
    SELECT jsonb_agg(line - 'isDestination' ORDER BY position)
    FROM jsonb_array_elements("parsedJson"->'lines') WITH ORDINALITY AS items(line, position)
))
WHERE jsonb_path_exists("parsedJson", '$.lines[*].isDestination');

COMMIT;
