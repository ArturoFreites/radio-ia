import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  AUDIO_BIBLIOTECA_MAX_BYTES,
  extensionDesdeUpload,
  guardarAudioBiblioteca,
} from "@/lib/audios/storage";
import { prisma } from "@/lib/prisma";
import { getSessionRadioId } from "@/lib/session";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const carpeta = await prisma.audioCarpeta.findFirst({ where: { id, radioId }, select: { id: true } });
  if (!carpeta) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const archivos = await prisma.audioArchivo.findMany({
    where: { carpetaId: id },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(archivos);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id: carpetaId } = await params;

  const carpeta = await prisma.audioCarpeta.findFirst({
    where: { id: carpetaId, radioId },
    select: { id: true },
  });
  if (!carpeta) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file requerido" }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: "Archivo vacío" }, { status: 400 });
  }
  if (file.size > AUDIO_BIBLIOTECA_MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera 15 MB" }, { status: 400 });
  }

  const ext = extensionDesdeUpload(file.name, file.type);
  if (!ext) {
    return NextResponse.json(
      { error: "Formato no soportado. Usá MP3, WAV, M4A u OGG" },
      { status: 400 },
    );
  }

  const nombreRaw = form.get("nombre");
  const nombre =
    typeof nombreRaw === "string" && nombreRaw.trim().length > 0
      ? nombreRaw.trim().slice(0, 120)
      : file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Audio";

  const archivoId = randomUUID().replace(/-/g, "").slice(0, 24);
  const buffer = Buffer.from(await file.arrayBuffer());

  let relativePath: string;
  try {
    const saved = await guardarAudioBiblioteca(buffer, radioId, carpetaId, archivoId, ext);
    relativePath = saved.relativePath;
  } catch {
    return NextResponse.json({ error: "No se pudo guardar el archivo" }, { status: 500 });
  }

  const maxOrden = await prisma.audioArchivo.aggregate({
    where: { carpetaId },
    _max: { orden: true },
  });

  const archivo = await prisma.audioArchivo.create({
    data: {
      id: archivoId,
      carpetaId,
      nombre,
      audioUrl: relativePath,
      orden: (maxOrden._max.orden ?? -1) + 1,
    },
  });

  return NextResponse.json(archivo, { status: 201 });
}
