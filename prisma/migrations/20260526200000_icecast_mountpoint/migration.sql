-- AlterTable: reemplaza campos de sync broadcast por mountpoint Icecast
ALTER TABLE "Radio" DROP COLUMN IF EXISTS "aireSyncProgramaId",
DROP COLUMN IF EXISTS "aireSyncBloqueIndex",
DROP COLUMN IF EXISTS "aireSyncStartedAt";

ALTER TABLE "Radio" ADD COLUMN "icecastMountpoint" TEXT;

-- Rellena mountpoints para radios existentes
UPDATE "Radio"
SET "icecastMountpoint" = '/' || SUBSTRING("id" FROM 1 FOR 12) || '.opus'
WHERE "icecastMountpoint" IS NULL;
