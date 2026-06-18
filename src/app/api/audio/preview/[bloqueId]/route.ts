import { access } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { TipoBloque } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getPreviewDirForBloque } from "@/lib/audio/previewPaths";
import { createAudioFileResponse } from "@/lib/audio/serveAudioFile";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bloqueId: string }> },
): Promise<Response> {
  const { bloqueId } = await params;

  const bloque = await prisma.bloque.findUnique({
    where: { id: bloqueId },
    select: { tipo: true, audioUrl: true },
  });
  if (!bloque) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (bloque.tipo === TipoBloque.CUNA && bloque.audioUrl && !bloque.audioUrl.startsWith("/api/")) {
    try {
      await access(bloque.audioUrl);
    } catch {
      return NextResponse.json({ error: "Audio no disponible" }, { status: 404 });
    }
    return createAudioFileResponse(bloque.audioUrl, request);
  }

  const dir = getPreviewDirForBloque(bloqueId);
  const archivos = await readdir(dir).catch(() => []);
  const mp3 = archivos.filter((f) => f.endsWith(".mp3"));
  if (mp3.length === 0) {
    return NextResponse.json({ error: "Preview no disponible" }, { status: 404 });
  }
  const prefer = ["noticia_preview.mp3", "apertura.mp3", "publicidad.mp3", "cierre.mp3"];
  const archivo = prefer.find((name) => mp3.includes(name)) ?? mp3.sort().at(-1);
  if (!archivo) {
    return NextResponse.json({ error: "Preview no disponible" }, { status: 404 });
  }
  const path = join(dir, archivo);
  return createAudioFileResponse(path, request);
}
