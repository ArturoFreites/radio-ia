import { NextResponse } from "next/server";
import { EstadoBloque, TipoBloque } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getGenerarPreviewQueue } from "@/lib/queue/jobs";
import { getSessionRadioId } from "@/lib/session";
import { getBloqueConProgramaRadio } from "@/lib/bloques/auth";

const TIPOS_PREVIEW = new Set<TipoBloque>([
  TipoBloque.APERTURA,
  TipoBloque.NOTICIA,
  TipoBloque.PUBLICIDAD,
  TipoBloque.CIERRE,
]);

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const found = await getBloqueConProgramaRadio(id);
  if (!found || found.radioId !== radioId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const bloque = found.bloque;
  if (!TIPOS_PREVIEW.has(bloque.tipo)) {
    return NextResponse.json({ error: "Tipo de bloque sin preview ElevenLabs" }, { status: 400 });
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY no configurada" }, { status: 503 });
  }

  await prisma.bloque.update({
    where: { id },
    data: { estado: EstadoBloque.GENERANDO_GUION },
  });

  await getGenerarPreviewQueue().add("generar-preview", { bloqueId: id }, { removeOnComplete: true });

  return NextResponse.json({ status: "en_proceso" });
}
