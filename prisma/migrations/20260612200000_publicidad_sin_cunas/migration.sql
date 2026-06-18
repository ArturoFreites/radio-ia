-- AlterTable: campos de publicidad en Anunciante
ALTER TABLE "Anunciante" ADD COLUMN "texto" TEXT;
ALTER TABLE "Anunciante" ADD COLUMN "estilo" TEXT NOT NULL DEFAULT 'energetico';
ALTER TABLE "Anunciante" ADD COLUMN "audioUrl" TEXT;
ALTER TABLE "Anunciante" ADD COLUMN "duracion" INTEGER;

-- Migrar datos desde Cuna (primera cuña activa por anunciante)
UPDATE "Anunciante" a
SET
  "texto" = sub."texto",
  "estilo" = COALESCE(sub."estilo", 'energetico'),
  "audioUrl" = sub."audioUrl",
  "duracion" = sub."duracion"
FROM (
  SELECT DISTINCT ON (c."anuncianteId")
    c."anuncianteId",
    COALESCE(
      NULLIF(TRIM(c."guion"), ''),
      NULLIF(TRIM(c."descripcion"), ''),
      NULLIF(TRIM(c."producto"), '')
    ) AS "texto",
    c."estilo",
    c."audioUrl",
    c."duracion"
  FROM "Cuna" c
  ORDER BY c."anuncianteId", c."esActiva" DESC, c."createdAt" ASC
) sub
WHERE a.id = sub."anuncianteId";

-- DropTable
DROP TABLE "Cuna";
