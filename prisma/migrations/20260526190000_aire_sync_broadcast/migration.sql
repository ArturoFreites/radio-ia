-- AlterTable
ALTER TABLE "Radio" ADD COLUMN "aireSyncProgramaId" TEXT,
ADD COLUMN "aireSyncBloqueIndex" INTEGER,
ADD COLUMN "aireSyncStartedAt" TIMESTAMP(3);
