-- CreateEnum
CREATE TYPE "TipoSlot" AS ENUM ('PROGRAMA', 'DJ');

-- AlterTable
ALTER TABLE "Radio" ADD COLUMN "aireToken" TEXT;

UPDATE "Radio" SET "aireToken" = 'air_' || replace("id", '-', '') WHERE "aireToken" IS NULL;

ALTER TABLE "Radio" ALTER COLUMN "aireToken" SET NOT NULL;

CREATE UNIQUE INDEX "Radio_aireToken_key" ON "Radio"("aireToken");

-- CreateTable
CREATE TABLE "SlotGrilla" (
    "id" TEXT NOT NULL,
    "radioId" TEXT NOT NULL,
    "diaDeSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "duracionMin" INTEGER NOT NULL,
    "tipo" "TipoSlot" NOT NULL,
    "programaId" TEXT,
    "anticipacionHoras" INTEGER NOT NULL DEFAULT 2,
    "esActivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotGrilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoGrilla" (
    "id" TEXT NOT NULL,
    "radioId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "duracionMin" INTEGER NOT NULL,
    "tipo" "TipoSlot" NOT NULL,
    "programaId" TEXT,
    "anticipacionHoras" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoGrilla_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SlotGrilla" ADD CONSTRAINT "SlotGrilla_radioId_fkey" FOREIGN KEY ("radioId") REFERENCES "Radio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotGrilla" ADD CONSTRAINT "SlotGrilla_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoGrilla" ADD CONSTRAINT "EventoGrilla_radioId_fkey" FOREIGN KEY ("radioId") REFERENCES "Radio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoGrilla" ADD CONSTRAINT "EventoGrilla_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
