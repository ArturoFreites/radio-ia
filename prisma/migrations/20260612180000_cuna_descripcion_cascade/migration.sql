-- AlterTable
ALTER TABLE "Cuna" ADD COLUMN "descripcion" TEXT;

-- DropForeignKey
ALTER TABLE "Anunciante" DROP CONSTRAINT "Anunciante_radioId_fkey";

-- DropForeignKey
ALTER TABLE "Cuna" DROP CONSTRAINT "Cuna_anuncianteId_fkey";

-- AddForeignKey
ALTER TABLE "Anunciante" ADD CONSTRAINT "Anunciante_radioId_fkey" FOREIGN KEY ("radioId") REFERENCES "Radio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuna" ADD CONSTRAINT "Cuna_anuncianteId_fkey" FOREIGN KEY ("anuncianteId") REFERENCES "Anunciante"("id") ON DELETE CASCADE ON UPDATE CASCADE;
