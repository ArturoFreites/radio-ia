-- AlterTable SlotGrilla
ALTER TABLE "SlotGrilla" ADD COLUMN "djTextoActiva" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SlotGrilla" ADD COLUMN "djTextoIntervaloMin" INTEGER;
ALTER TABLE "SlotGrilla" ADD COLUMN "djTextoContenido" TEXT;

-- AlterTable EventoGrilla
ALTER TABLE "EventoGrilla" ADD COLUMN "djTextoActiva" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EventoGrilla" ADD COLUMN "djTextoIntervaloMin" INTEGER;
ALTER TABLE "EventoGrilla" ADD COLUMN "djTextoContenido" TEXT;
