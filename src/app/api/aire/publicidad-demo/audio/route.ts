import { NextResponse } from "next/server";
import { z } from "zod";
import { resolverRadioPorAireToken } from "@/lib/aire/validarToken";
import { synthesizeElevenLabsBuffer } from "@/lib/gemini/tts";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  aireToken: z.string().min(1),
  texto: z.string().min(1).max(2000),
  voiceId: z.string().min(1),
});

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

  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY no configurada" }, { status: 503 });
  }

  const vozAsignada = await prisma.radioVoz.findFirst({
    where: {
      radioId: radio.id,
      voz: { geminiVoiceId: parsed.data.voiceId, esActiva: true },
    },
    select: { id: true },
  });
  if (!vozAsignada) {
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
