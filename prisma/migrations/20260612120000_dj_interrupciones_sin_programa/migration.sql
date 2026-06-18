-- Convert PROGRAMA slots to DJ before enum change
UPDATE "SlotGrilla" SET "tipo" = 'DJ' WHERE "tipo" = 'PROGRAMA';
UPDATE "EventoGrilla" SET "tipo" = 'DJ' WHERE "tipo" = 'PROGRAMA';

-- Drop FK to Programa
ALTER TABLE "SlotGrilla" DROP CONSTRAINT IF EXISTS "SlotGrilla_programaId_fkey";
ALTER TABLE "EventoGrilla" DROP CONSTRAINT IF EXISTS "EventoGrilla_programaId_fkey";

-- Remove programa columns
ALTER TABLE "SlotGrilla" DROP COLUMN IF EXISTS "programaId";
ALTER TABLE "SlotGrilla" DROP COLUMN IF EXISTS "anticipacionHoras";
ALTER TABLE "EventoGrilla" DROP COLUMN IF EXISTS "programaId";
ALTER TABLE "EventoGrilla" DROP COLUMN IF EXISTS "anticipacionHoras";

-- Add DJ interruption fields
ALTER TABLE "SlotGrilla" ADD COLUMN IF NOT EXISTS "presentacionCadaTemas" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "SlotGrilla" ADD COLUMN IF NOT EXISTS "djHoraActiva" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SlotGrilla" ADD COLUMN IF NOT EXISTS "djHoraIntervaloMin" INTEGER;
ALTER TABLE "SlotGrilla" ADD COLUMN IF NOT EXISTS "djClimaActivo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SlotGrilla" ADD COLUMN IF NOT EXISTS "djClimaIntervaloMin" INTEGER;
ALTER TABLE "SlotGrilla" ADD COLUMN IF NOT EXISTS "djPublicidadActiva" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SlotGrilla" ADD COLUMN IF NOT EXISTS "djPublicidadIntervaloMin" INTEGER;

ALTER TABLE "EventoGrilla" ADD COLUMN IF NOT EXISTS "presentacionCadaTemas" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "EventoGrilla" ADD COLUMN IF NOT EXISTS "djHoraActiva" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EventoGrilla" ADD COLUMN IF NOT EXISTS "djHoraIntervaloMin" INTEGER;
ALTER TABLE "EventoGrilla" ADD COLUMN IF NOT EXISTS "djClimaActivo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EventoGrilla" ADD COLUMN IF NOT EXISTS "djClimaIntervaloMin" INTEGER;
ALTER TABLE "EventoGrilla" ADD COLUMN IF NOT EXISTS "djPublicidadActiva" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EventoGrilla" ADD COLUMN IF NOT EXISTS "djPublicidadIntervaloMin" INTEGER;

-- Set default on tipo column
ALTER TABLE "SlotGrilla" ALTER COLUMN "tipo" SET DEFAULT 'DJ';
ALTER TABLE "EventoGrilla" ALTER COLUMN "tipo" SET DEFAULT 'DJ';

-- Replace TipoSlot enum (remove PROGRAMA)
ALTER TYPE "TipoSlot" RENAME TO "TipoSlot_old";
CREATE TYPE "TipoSlot" AS ENUM ('DJ');
ALTER TABLE "SlotGrilla" ALTER COLUMN "tipo" DROP DEFAULT;
ALTER TABLE "SlotGrilla" ALTER COLUMN "tipo" TYPE "TipoSlot" USING ('DJ'::"TipoSlot");
ALTER TABLE "SlotGrilla" ALTER COLUMN "tipo" SET DEFAULT 'DJ';
ALTER TABLE "EventoGrilla" ALTER COLUMN "tipo" DROP DEFAULT;
ALTER TABLE "EventoGrilla" ALTER COLUMN "tipo" TYPE "TipoSlot" USING ('DJ'::"TipoSlot");
ALTER TABLE "EventoGrilla" ALTER COLUMN "tipo" SET DEFAULT 'DJ';
DROP TYPE "TipoSlot_old";
