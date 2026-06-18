-- CreateEnum
CREATE TYPE "EstadoSesionSpotify" AS ENUM ('ACTIVA', 'PAUSADA', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "EstadoPresentacion" AS ENUM ('PENDIENTE', 'GENERANDO', 'LISTA', 'ERROR');

-- CreateTable
CREATE TABLE "SpotifyConexion" (
    "id" TEXT NOT NULL,
    "radioId" TEXT NOT NULL,
    "spotifyUserId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpotifyConexion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotifySesion" (
    "id" TEXT NOT NULL,
    "radioId" TEXT NOT NULL,
    "conexionId" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "playlistNombre" TEXT NOT NULL,
    "voz1Id" TEXT NOT NULL,
    "voz2Id" TEXT NOT NULL,
    "estado" "EstadoSesionSpotify" NOT NULL DEFAULT 'ACTIVA',
    "panelToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpotifySesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresentacionTrack" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "trackSpotifyId" TEXT NOT NULL,
    "trackNombre" TEXT NOT NULL,
    "artistaNombre" TEXT NOT NULL,
    "albumNombre" TEXT NOT NULL,
    "duracionMs" INTEGER NOT NULL,
    "coverUrl" TEXT,
    "guion" TEXT,
    "audioUrl" TEXT,
    "estado" "EstadoPresentacion" NOT NULL DEFAULT 'PENDIENTE',
    "errorLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresentacionTrack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpotifyConexion_radioId_key" ON "SpotifyConexion"("radioId");

-- CreateIndex
CREATE UNIQUE INDEX "SpotifySesion_panelToken_key" ON "SpotifySesion"("panelToken");

-- CreateIndex
CREATE UNIQUE INDEX "PresentacionTrack_sesionId_trackSpotifyId_key" ON "PresentacionTrack"("sesionId", "trackSpotifyId");

-- AddForeignKey
ALTER TABLE "SpotifyConexion" ADD CONSTRAINT "SpotifyConexion_radioId_fkey" FOREIGN KEY ("radioId") REFERENCES "Radio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotifySesion" ADD CONSTRAINT "SpotifySesion_radioId_fkey" FOREIGN KEY ("radioId") REFERENCES "Radio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotifySesion" ADD CONSTRAINT "SpotifySesion_conexionId_fkey" FOREIGN KEY ("conexionId") REFERENCES "SpotifyConexion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentacionTrack" ADD CONSTRAINT "PresentacionTrack_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "SpotifySesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
