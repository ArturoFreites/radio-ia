-- Deduplicar Voz por geminiVoiceId (conservar el registro más antiguo) antes del constraint UNIQUE.

WITH keeper AS (
  SELECT DISTINCT ON ("geminiVoiceId") id AS keeper_id, "geminiVoiceId"
  FROM "Voz"
  ORDER BY "geminiVoiceId", "createdAt" ASC
),
to_delete AS (
  SELECT v.id AS dupe_id, k.keeper_id
  FROM "Voz" v
  INNER JOIN keeper k ON v."geminiVoiceId" = k."geminiVoiceId"
  WHERE v.id <> k.keeper_id
)
UPDATE "Bloque" b
SET "vozId" = td.keeper_id
FROM to_delete td
WHERE b."vozId" = td.dupe_id;

WITH keeper AS (
  SELECT DISTINCT ON ("geminiVoiceId") id AS keeper_id, "geminiVoiceId"
  FROM "Voz"
  ORDER BY "geminiVoiceId", "createdAt" ASC
),
to_delete AS (
  SELECT v.id AS dupe_id, k.keeper_id
  FROM "Voz" v
  INNER JOIN keeper k ON v."geminiVoiceId" = k."geminiVoiceId"
  WHERE v.id <> k.keeper_id
)
UPDATE "RadioVoz" rv
SET "vozId" = td.keeper_id
FROM to_delete td
WHERE rv."vozId" = td.dupe_id
  AND NOT EXISTS (
    SELECT 1
    FROM "RadioVoz" existing
    WHERE existing."radioId" = rv."radioId"
      AND existing."vozId" = td.keeper_id
  );

WITH keeper AS (
  SELECT DISTINCT ON ("geminiVoiceId") id AS keeper_id, "geminiVoiceId"
  FROM "Voz"
  ORDER BY "geminiVoiceId", "createdAt" ASC
),
to_delete AS (
  SELECT v.id AS dupe_id, k.keeper_id
  FROM "Voz" v
  INNER JOIN keeper k ON v."geminiVoiceId" = k."geminiVoiceId"
  WHERE v.id <> k.keeper_id
)
DELETE FROM "RadioVoz" rv
USING to_delete td
WHERE rv."vozId" = td.dupe_id
  AND EXISTS (
    SELECT 1
    FROM "RadioVoz" existing
    WHERE existing."radioId" = rv."radioId"
      AND existing."vozId" = td.keeper_id
  );

WITH keeper AS (
  SELECT DISTINCT ON ("geminiVoiceId") id AS keeper_id, "geminiVoiceId"
  FROM "Voz"
  ORDER BY "geminiVoiceId", "createdAt" ASC
),
to_delete AS (
  SELECT v.id AS dupe_id, k.keeper_id
  FROM "Voz" v
  INNER JOIN keeper k ON v."geminiVoiceId" = k."geminiVoiceId"
  WHERE v.id <> k.keeper_id
)
DELETE FROM "Voz" v
USING to_delete td
WHERE v.id = td.dupe_id;

CREATE UNIQUE INDEX "Voz_geminiVoiceId_key" ON "Voz"("geminiVoiceId");
