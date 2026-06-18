import { NextResponse } from "next/server";
import { GeneroVoz, TonoVoz } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionRadioId } from "@/lib/session";

const createVozSchema = z.object({
  nombre: z.string().min(2).max(80),
  descripcion: z.string().min(3).max(240).optional(),
  eventlabsVoiceId: z.string().min(3).max(100),
  genero: z.nativeEnum(GeneroVoz).default(GeneroVoz.NEUTRA),
  tono: z.nativeEnum(TonoVoz).default(TonoVoz.AMIGABLE),
  idioma: z.string().min(2).max(20).default("es-AR"),
  esPremium: z.boolean().optional(),
  nombreAlAire: z.string().min(1).max(60).optional(),
  personalidad: z.string().min(1).max(500).optional(),
});

export async function GET(): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const voces = await prisma.radioVoz.findMany({
    where: { radioId },
    include: { voz: true },
    orderBy: { voz: { nombre: "asc" } },
  });
  return NextResponse.json(voces);
}

export async function POST(request: Request): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = createVozSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const existingByVoiceId = await prisma.voz.findUnique({
    where: { geminiVoiceId: payload.eventlabsVoiceId },
  });
  if (existingByVoiceId && existingByVoiceId.nombre !== payload.nombre) {
    return NextResponse.json(
      { error: "Ya existe una voz con ese ElevenLabs voice ID" },
      { status: 400 },
    );
  }

  const voice = await prisma.voz.upsert({
    where: { nombre: payload.nombre },
    update: {
      descripcion: payload.descripcion ?? `${payload.nombre} para uso radial`,
      genero: payload.genero,
      tono: payload.tono,
      idioma: payload.idioma,
      geminiVoiceId: payload.eventlabsVoiceId,
      esActiva: true,
      esPremium: payload.esPremium ?? false,
    },
    create: {
      nombre: payload.nombre,
      descripcion: payload.descripcion ?? `${payload.nombre} para uso radial`,
      genero: payload.genero,
      tono: payload.tono,
      idioma: payload.idioma,
      geminiVoiceId: payload.eventlabsVoiceId,
      esActiva: true,
      esPremium: payload.esPremium ?? false,
    },
  });

  await prisma.radioVoz.upsert({
    where: {
      radioId_vozId: {
        radioId,
        vozId: voice.id,
      },
    },
    update: {
      nombreAlAire: payload.nombreAlAire ?? null,
      personalidad: payload.personalidad ?? null,
    },
    create: {
      radioId,
      vozId: voice.id,
      nombreAlAire: payload.nombreAlAire ?? null,
      personalidad: payload.personalidad ?? null,
    },
  });

  const radioVoice = await prisma.radioVoz.findFirst({
    where: { radioId, vozId: voice.id },
    include: { voz: true },
  });

  return NextResponse.json({ voz: radioVoice }, { status: 201 });
}
