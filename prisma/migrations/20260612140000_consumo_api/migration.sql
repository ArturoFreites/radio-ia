-- CreateEnum
CREATE TYPE "ProveedorConsumo" AS ENUM ('GEMINI', 'ELEVENLABS');

-- CreateEnum
CREATE TYPE "TipoConsumoApi" AS ENUM ('TEXTO', 'VOZ');

-- CreateTable
CREATE TABLE "ConsumoApiRegistro" (
    "id" TEXT NOT NULL,
    "radioId" TEXT NOT NULL,
    "proveedor" "ProveedorConsumo" NOT NULL,
    "tipo" "TipoConsumoApi" NOT NULL,
    "tokensEntrada" INTEGER,
    "tokensSalida" INTEGER,
    "caracteres" INTEGER,
    "costoEstimadoUsd" DOUBLE PRECISION NOT NULL,
    "modelo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumoApiRegistro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsumoApiRegistro_radioId_createdAt_idx" ON "ConsumoApiRegistro"("radioId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsumoApiRegistro_radioId_proveedor_createdAt_idx" ON "ConsumoApiRegistro"("radioId", "proveedor", "createdAt");

-- AddForeignKey
ALTER TABLE "ConsumoApiRegistro" ADD CONSTRAINT "ConsumoApiRegistro_radioId_fkey" FOREIGN KEY ("radioId") REFERENCES "Radio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
