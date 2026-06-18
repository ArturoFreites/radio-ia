import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Job } from "bullmq";
import { EstadoBloque, TipoBloque } from "@prisma/client";
import { getAudioDuration } from "@/lib/audio/ffmpeg";
import { getPreviewDirForBloque } from "@/lib/audio/previewPaths";
import { prisma } from "@/lib/prisma";
import { generarAperturaPreview } from "./apertura";
import { generarCierrePreview } from "./cierre";
import { generarNoticiaPreview } from "./noticia";
import { generarPublicidadPreview } from "./publicidad";
import type { BloqueConRadio } from "./apertura";

export async function procesarGenerarPreview(job: Job<{ bloqueId: string }>): Promise<void> {
  const { bloqueId } = job.data;
  const bloque = await prisma.bloque.findUnique({
    where: { id: bloqueId },
    include: { programa: { include: { radio: true } } },
  });
  if (!bloque) {
    throw new Error("Bloque no encontrado");
  }

  const typed = bloque as BloqueConRadio;

  try {
    switch (typed.tipo) {
      case TipoBloque.APERTURA:
        await generarAperturaPreview(typed);
        break;
      case TipoBloque.NOTICIA:
        await generarNoticiaPreview(typed);
        break;
      case TipoBloque.PUBLICIDAD:
        await generarPublicidadPreview(typed);
        break;
      case TipoBloque.CIERRE:
        await generarCierrePreview(typed);
        break;
      default:
        throw new Error(`Tipo no soportado para preview: ${typed.tipo}`);
    }

    const previewDir = getPreviewDirForBloque(bloqueId);
    const files = await readdir(previewDir);
    const mp3s = files.filter((f) => f.endsWith(".mp3"));
    const prefer = ["noticia_preview.mp3", "apertura.mp3", "publicidad.mp3", "cierre.mp3"];
    const chosen = prefer.find((name) => mp3s.includes(name)) ?? mp3s.sort().at(-1);
    if (!chosen) {
      throw new Error("No se generó archivo de preview");
    }
    const path = join(previewDir, chosen);
    const duracion = await getAudioDuration(path);

    await prisma.bloque.update({
      where: { id: bloqueId },
      data: {
        estado: EstadoBloque.LISTO,
        previewCachedAt: new Date(),
        duracion,
        audioUrl: `/api/audio/preview/${bloqueId}`,
      },
    });
  } catch (error) {
    await prisma.bloque.update({
      where: { id: bloqueId },
      data: { estado: EstadoBloque.ERROR },
    });
    throw error;
  }
}
