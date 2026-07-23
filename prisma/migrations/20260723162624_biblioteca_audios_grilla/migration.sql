-- CreateEnum
CREATE TYPE "ModoRotacionAudio" AS ENUM ('SECUENCIAL', 'ALEATORIO');

-- AlterTable SlotGrilla
ALTER TABLE "SlotGrilla" ADD COLUMN "djAudioActiva" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SlotGrilla" ADD COLUMN "djAudioIntervaloMin" INTEGER;
ALTER TABLE "SlotGrilla" ADD COLUMN "djAudioCarpetaId" TEXT;

-- AlterTable EventoGrilla
ALTER TABLE "EventoGrilla" ADD COLUMN "djAudioActiva" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EventoGrilla" ADD COLUMN "djAudioIntervaloMin" INTEGER;
ALTER TABLE "EventoGrilla" ADD COLUMN "djAudioCarpetaId" TEXT;

-- CreateTable
CREATE TABLE "AudioCarpeta" (
    "id" TEXT NOT NULL,
    "radioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "modoRotacion" "ModoRotacionAudio" NOT NULL DEFAULT 'SECUENCIAL',
    "esActiva" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioCarpeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioArchivo" (
    "id" TEXT NOT NULL,
    "carpetaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "duracionSec" INTEGER,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "esActivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioArchivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AudioCarpeta_radioId_idx" ON "AudioCarpeta"("radioId");

-- CreateIndex
CREATE INDEX "AudioArchivo_carpetaId_orden_idx" ON "AudioArchivo"("carpetaId", "orden");

-- AddForeignKey
ALTER TABLE "AudioCarpeta" ADD CONSTRAINT "AudioCarpeta_radioId_fkey" FOREIGN KEY ("radioId") REFERENCES "Radio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioArchivo" ADD CONSTRAINT "AudioArchivo_carpetaId_fkey" FOREIGN KEY ("carpetaId") REFERENCES "AudioCarpeta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
