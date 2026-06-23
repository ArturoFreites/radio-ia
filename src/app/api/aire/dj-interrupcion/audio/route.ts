import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validarVozRadioDj } from "@/lib/aire/djInterrupcionServicio";
import { resolverRadioPorAireToken } from "@/lib/aire/validarToken";
import { synthesizeElevenLabsBuffer } from "@/lib/gemini/tts";
import { contentTypeDesdeRutaAudio, resolverRutaAudioAlmacenado } from "@/lib/publicidad/audioPath";
import { prisma } from "@/lib/prisma";

const textoSchema = z.object({
  aireToken: z.string().min(1),
  texto: z.string().min(1).max(4000),
  voiceId: z.string().min(1),
});

const publicidadSchema = z.object({
  aireToken: z.string().min(1),
  publicidadId: z.string().min(1),
});

const bodySchema = z.union([textoSchema, publicidadSchema]);

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const radio = await resolverRadioPorAireToken(parsed.data.aireToken);
  if (!radio) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if ("publicidadId" in parsed.data) {
    const publicidad = await prisma.anunciante.findFirst({
      where: {
        id: parsed.data.publicidadId,
        esActivo: true,
        radioId: radio.id,
      },
      select: { audioUrl: true, texto: true },
    });
    if (!publicidad) {
      return NextResponse.json({ error: "Publicidad no encontrada" }, { status: 404 });
    }
    if (publicidad.audioUrl) {
      const filePath = await resolverRutaAudioAlmacenado(publicidad.audioUrl);
      if (!filePath) {
        return NextResponse.json({ error: "Audio no disponible" }, { status: 404 });
      }
      try {
        const buffer = await readFile(filePath);
        return new Response(buffer, {
          headers: {
            "Content-Type": contentTypeDesdeRutaAudio(filePath),
            "Cache-Control": "no-store",
          },
        });
      } catch {
        return NextResponse.json({ error: "Audio no disponible" }, { status: 404 });
      }
    }
    if (!publicidad.texto?.trim()) {
      return NextResponse.json({ error: "Publicidad sin audio ni texto" }, { status: 400 });
    }
    return NextResponse.json({ error: "Usá texto + voiceId para TTS" }, { status: 400 });
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY no configurada" }, { status: 503 });
  }

  const ok = await validarVozRadioDj(radio.id, parsed.data.voiceId);
  if (!ok) {
    return NextResponse.json({ error: "Voz no disponible para esta radio" }, { status: 400 });
  }

  try {
    const { buffer } = await synthesizeElevenLabsBuffer({
      texto: parsed.data.texto.trim(),
      vozId: parsed.data.voiceId,
    });
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Error al generar el audio" }, { status: 502 });
  }
}
