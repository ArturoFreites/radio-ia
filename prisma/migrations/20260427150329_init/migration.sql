-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'OPERADOR');

-- CreateEnum
CREATE TYPE "GeneroVoz" AS ENUM ('MASCULINA', 'FEMENINA', 'NEUTRA');

-- CreateEnum
CREATE TYPE "TonoVoz" AS ENUM ('SERIO', 'CALIDO', 'ENERGETICO', 'AMIGABLE', 'FORMAL');

-- CreateEnum
CREATE TYPE "EstadoPrograma" AS ENUM ('BORRADOR', 'GENERANDO', 'LISTO', 'EN_EMISION', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "TipoBloque" AS ENUM ('INTRO', 'NOTICIAS', 'CUNA', 'ENTRETENIMIENTO', 'TRANSICION', 'SALUDO', 'CIERRE');

-- CreateEnum
CREATE TYPE "EstadoBloque" AS ENUM ('PENDIENTE', 'GENERANDO_GUION', 'GUION_LISTO', 'GENERANDO_AUDIO', 'LISTO', 'ERROR');

-- CreateEnum
CREATE TYPE "EstadoGeneracion" AS ENUM ('EN_COLA', 'PROCESANDO', 'COMPLETADA', 'ERROR');

-- CreateTable
CREATE TABLE "Radio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "pais" TEXT NOT NULL DEFAULT 'Argentina',
    "logoUrl" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'STARTER',
    "fuentesNoticias" TEXT[],
    "estiloLocucion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Radio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'OPERADOR',
    "radioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voz" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "genero" "GeneroVoz" NOT NULL,
    "tono" "TonoVoz" NOT NULL,
    "idioma" TEXT NOT NULL DEFAULT 'es-AR',
    "geminiVoiceId" TEXT NOT NULL,
    "previewUrl" TEXT,
    "esActiva" BOOLEAN NOT NULL DEFAULT true,
    "esPremium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadioVoz" (
    "id" TEXT NOT NULL,
    "radioId" TEXT NOT NULL,
    "vozId" TEXT NOT NULL,
    "alias" TEXT,

    CONSTRAINT "RadioVoz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Programa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "radioId" TEXT NOT NULL,
    "estado" "EstadoPrograma" NOT NULL DEFAULT 'BORRADOR',
    "duracionEstimada" INTEGER,
    "panelUrl" TEXT,
    "panelToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Programa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bloque" (
    "id" TEXT NOT NULL,
    "programaId" TEXT NOT NULL,
    "tipo" "TipoBloque" NOT NULL,
    "orden" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "vozId" TEXT,
    "config" JSONB,
    "guion" TEXT,
    "audioUrl" TEXT,
    "duracion" INTEGER,
    "estado" "EstadoBloque" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bloque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anunciante" (
    "id" TEXT NOT NULL,
    "radioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "rubro" TEXT,
    "notas" TEXT,
    "esActivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anunciante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuna" (
    "id" TEXT NOT NULL,
    "anuncianteId" TEXT NOT NULL,
    "producto" TEXT NOT NULL,
    "oferta" TEXT,
    "estilo" TEXT NOT NULL DEFAULT 'energetico',
    "guion" TEXT,
    "audioUrl" TEXT,
    "duracion" INTEGER,
    "esActiva" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cuna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Generacion" (
    "id" TEXT NOT NULL,
    "programaId" TEXT NOT NULL,
    "estado" "EstadoGeneracion" NOT NULL DEFAULT 'EN_COLA',
    "audioFinalUrl" TEXT,
    "duracionTotal" INTEGER,
    "costoTokens" DOUBLE PRECISION,
    "errorLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completadaAt" TIMESTAMP(3),

    CONSTRAINT "Generacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Radio_slug_key" ON "Radio"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Voz_nombre_key" ON "Voz"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "RadioVoz_radioId_vozId_key" ON "RadioVoz"("radioId", "vozId");

-- CreateIndex
CREATE UNIQUE INDEX "Programa_panelToken_key" ON "Programa"("panelToken");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_radioId_fkey" FOREIGN KEY ("radioId") REFERENCES "Radio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadioVoz" ADD CONSTRAINT "RadioVoz_radioId_fkey" FOREIGN KEY ("radioId") REFERENCES "Radio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadioVoz" ADD CONSTRAINT "RadioVoz_vozId_fkey" FOREIGN KEY ("vozId") REFERENCES "Voz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programa" ADD CONSTRAINT "Programa_radioId_fkey" FOREIGN KEY ("radioId") REFERENCES "Radio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bloque" ADD CONSTRAINT "Bloque_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bloque" ADD CONSTRAINT "Bloque_vozId_fkey" FOREIGN KEY ("vozId") REFERENCES "Voz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anunciante" ADD CONSTRAINT "Anunciante_radioId_fkey" FOREIGN KEY ("radioId") REFERENCES "Radio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuna" ADD CONSTRAINT "Cuna_anuncianteId_fkey" FOREIGN KEY ("anuncianteId") REFERENCES "Anunciante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generacion" ADD CONSTRAINT "Generacion_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
