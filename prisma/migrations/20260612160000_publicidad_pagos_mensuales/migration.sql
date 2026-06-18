-- CreateEnum
CREATE TYPE "EstadoPagoPublicidad" AS ENUM ('PENDIENTE', 'PAGADO', 'PARCIAL');

-- AlterTable
ALTER TABLE "Anunciante" ADD COLUMN "montoMensual" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "PublicidadPagoMensual" (
    "id" TEXT NOT NULL,
    "anuncianteId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "monto" DOUBLE PRECISION,
    "estado" "EstadoPagoPublicidad" NOT NULL DEFAULT 'PENDIENTE',
    "fechaPago" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicidadPagoMensual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicidadPagoMensual_anio_mes_idx" ON "PublicidadPagoMensual"("anio", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "PublicidadPagoMensual_anuncianteId_anio_mes_key" ON "PublicidadPagoMensual"("anuncianteId", "anio", "mes");

-- AddForeignKey
ALTER TABLE "PublicidadPagoMensual" ADD CONSTRAINT "PublicidadPagoMensual_anuncianteId_fkey" FOREIGN KEY ("anuncianteId") REFERENCES "Anunciante"("id") ON DELETE CASCADE ON UPDATE CASCADE;
