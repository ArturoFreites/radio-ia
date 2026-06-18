-- AlterTable
ALTER TABLE "SlotGrilla" ADD COLUMN "playlistId" TEXT,
ADD COLUMN "playlistNombre" TEXT;

-- AlterTable
ALTER TABLE "EventoGrilla" ADD COLUMN "playlistId" TEXT,
ADD COLUMN "playlistNombre" TEXT;

-- AlterTable
ALTER TABLE "SpotifySesion" ALTER COLUMN "voz1Id" DROP NOT NULL,
ALTER COLUMN "voz2Id" DROP NOT NULL;
