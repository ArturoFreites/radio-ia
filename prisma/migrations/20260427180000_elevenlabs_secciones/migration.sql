-- AlterEnum
ALTER TYPE "TipoBloque" ADD VALUE 'APERTURA';
ALTER TYPE "TipoBloque" ADD VALUE 'NOTICIA';
ALTER TYPE "TipoBloque" ADD VALUE 'PUBLICIDAD';

-- AlterTable
ALTER TABLE "Bloque" ADD COLUMN "elevenlabsVoiceId" TEXT,
ADD COLUMN "elevenlabsVoiceId2" TEXT,
ADD COLUMN "previewCachedAt" TIMESTAMP(3);
