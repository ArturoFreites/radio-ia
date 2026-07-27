import { createReadStream } from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  resolverAudioGenerado,
  TIPOS_AUDIO_GENERADO,
} from "@/lib/audios/catalogoGenerados";
import { getSessionRadioId } from "@/lib/session";

const querySchema = z.object({
  tipo: z.enum(TIPOS_AUDIO_GENERADO),
  download: z.enum(["1", "true"]).optional(),
  playlistId: z.string().trim().min(1).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);

  const parsed = querySchema.safeParse({
    tipo: request.nextUrl.searchParams.get("tipo") ?? undefined,
    download: request.nextUrl.searchParams.get("download") ?? undefined,
    playlistId: request.nextUrl.searchParams.get("playlistId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const resuelto = await resolverAudioGenerado(
    radioId,
    id,
    parsed.data.tipo,
    parsed.data.playlistId,
  );
  if (!resuelto) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": resuelto.contentType,
    "Cache-Control": "no-cache",
  };

  if (parsed.data.download) {
    headers["Content-Disposition"] =
      `attachment; filename="${resuelto.nombreDescarga.replace(/"/g, "")}"`;
  }

  const stream = createReadStream(resuelto.filePath);
  return new Response(stream as unknown as ReadableStream, { headers });
}
