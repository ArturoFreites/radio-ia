-- AlterTable
ALTER TABLE "SlotGrilla" ADD COLUMN "voz1Id" TEXT,
ADD COLUMN "voz2Id" TEXT;

-- AlterTable
ALTER TABLE "EventoGrilla" ADD COLUMN "voz1Id" TEXT,
ADD COLUMN "voz2Id" TEXT;

-- AddForeignKey
ALTER TABLE "SlotGrilla" ADD CONSTRAINT "SlotGrilla_voz1Id_fkey" FOREIGN KEY ("voz1Id") REFERENCES "Voz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotGrilla" ADD CONSTRAINT "SlotGrilla_voz2Id_fkey" FOREIGN KEY ("voz2Id") REFERENCES "Voz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoGrilla" ADD CONSTRAINT "EventoGrilla_voz1Id_fkey" FOREIGN KEY ("voz1Id") REFERENCES "Voz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoGrilla" ADD CONSTRAINT "EventoGrilla_voz2Id_fkey" FOREIGN KEY ("voz2Id") REFERENCES "Voz"("id") ON DELETE SET NULL ON UPDATE CASCADE;
