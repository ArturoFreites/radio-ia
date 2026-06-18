import { NextRequest, NextResponse } from "next/server";
import { GeneroVoz, TonoVoz } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionRadioId } from "@/lib/session";

const updateVozSchema = z.object({
  nombre: z.string().min(2).max(80).optional(),
  descripcion: z.string().min(3).max(240).optional(),
  eventlabsVoiceId: z.string().min(3).max(100).optional(),
  genero: z.nativeEnum(GeneroVoz).optional(),
  tono: z.nativeEnum(TonoVoz).optional(),
  idioma: z.string().min(2).max(20).optional(),
  esPremium: z.boolean().optional(),
  nombreAlAire: z.string().min(1).max(60).nullable().optional(),
  personalidad: z.string().min(1).max(500).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ vozId: string }> },
): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { vozId } = await params;
  const radioVoz = await prisma.radioVoz.findFirst({
    where: { radioId, vozId },
    include: { voz: true },
  });
  if (!radioVoz) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const parsed = updateVozSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  if (payload.eventlabsVoiceId !== undefined) {
    const conflict = await prisma.voz.findUnique({
      where: { geminiVoiceId: payload.eventlabsVoiceId },
    });
    if (conflict && conflict.id !== vozId) {
      return NextResponse.json(
        { error: "Ya existe una voz con ese ElevenLabs voice ID" },
        { status: 400 },
      );
    }
  }

  const updated = await prisma.voz.update({
    where: { id: vozId },
    data: {
      ...(payload.nombre !== undefined ? { nombre: payload.nombre } : {}),
      ...(payload.descripcion !== undefined ? { descripcion: payload.descripcion } : {}),
      ...(payload.eventlabsVoiceId !== undefined ? { geminiVoiceId: payload.eventlabsVoiceId } : {}),
      ...(payload.genero !== undefined ? { genero: payload.genero } : {}),
      ...(payload.tono !== undefined ? { tono: payload.tono } : {}),
      ...(payload.idioma !== undefined ? { idioma: payload.idioma } : {}),
      ...(payload.esPremium !== undefined ? { esPremium: payload.esPremium } : {}),
    },
  });

  if (payload.nombreAlAire !== undefined || payload.personalidad !== undefined) {
    await prisma.radioVoz.update({
      where: { radioId_vozId: { radioId, vozId } },
      data: {
        ...(payload.nombreAlAire !== undefined ? { nombreAlAire: payload.nombreAlAire } : {}),
        ...(payload.personalidad !== undefined ? { personalidad: payload.personalidad } : {}),
      },
    });
  }

  const radioVoice = await prisma.radioVoz.findFirst({
    where: { radioId, vozId },
    include: { voz: true },
  });

  return NextResponse.json({ voz: radioVoice ?? updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ vozId: string }> },
): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { vozId } = await params;
  const radioVoz = await prisma.radioVoz.findFirst({ where: { radioId, vozId } });
  if (!radioVoz) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.$transaction([
    prisma.bloque.updateMany({
      where: {
        vozId,
        programa: { radioId },
      },
      data: { vozId: null },
    }),
    prisma.radioVoz.delete({
      where: {
        radioId_vozId: {
          radioId,
          vozId,
        },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
