import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { extraerContenidoNoticia } from "@/lib/noticias/scraper";
import { getSessionRadioId } from "@/lib/session";
import { getBloqueConProgramaRadio } from "@/lib/bloques/auth";

const bodySchema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const found = await getBloqueConProgramaRadio(id);
  if (!found || found.radioId !== radioId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY no configurada" }, { status: 503 });
  }

  const contenido = await extraerContenidoNoticia(parsed.data.url, radioId);
  const prev = (found.bloque.config ?? {}) as Record<string, unknown>;

  await prisma.bloque.update({
    where: { id },
    data: {
      config: {
        ...prev,
        urlNoticia: parsed.data.url,
        contenidoNoticiaCache: contenido,
      },
    },
  });

  return NextResponse.json({ contenido });
}
