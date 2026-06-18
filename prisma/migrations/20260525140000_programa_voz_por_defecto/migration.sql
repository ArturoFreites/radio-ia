-- AlterTable
ALTER TABLE "Programa" ADD COLUMN "vozPorDefectoId" TEXT;

-- AddForeignKey
ALTER TABLE "Programa" ADD CONSTRAINT "Programa_vozPorDefectoId_fkey" FOREIGN KEY ("vozPorDefectoId") REFERENCES "Voz"("id") ON DELETE SET NULL ON UPDATE CASCADE;
