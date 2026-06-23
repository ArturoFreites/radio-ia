import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mergeSlotsDelDiaArgentina } from "@/lib/grilla/mergeDia";
import { prisma } from "@/lib/prisma";
import {
  buildTransicionSlotAudioUrl,
  generarTransicionSlot,
  transicionSlotAudioPath,
} from "@/lib/spotify/generarTransicionSlot";
import type { SlotHoy } from "@/types/grilla";

const bodySchema = z.object({
  token: z.string().min(1),
  slotId: z.string().min(1),
});

type TransicionSlotResponse = {
  audioUrl: string | null;
  playlistId: string | null;
  playlistNombre: string;
  djNombre: string;
};

async function resolverSlotDelDia(radioId: string, slotId: string): Promise<SlotHoy | null> {
  const ahora = new Date();
  const [slotsSemanales, eventos] = await Promise.all([
    prisma.slotGrilla.findMany({
      where: { radioId },
      include: {
        voz1: { select: { geminiVoiceId: true, nombre: true } },
        voz2: { select: { geminiVoiceId: true, nombre: true } },
      },
    }),
    prisma.eventoGrilla.findMany({
      where: { radioId },
      include: {
        voz1: { select: { geminiVoiceId: true, nombre: true } },
        voz2: { select: { geminiVoiceId: true, nombre: true } },
      },
    }),
  ]);
  const slots = mergeSlotsDelDiaArgentina(ahora, slotsSemanales, eventos);
  return slots.find((s) => s.id === slotId) ?? null;
}

function respuestaDesdeSlot(
  slot: SlotHoy,
  audioUrl: string | null,
): TransicionSlotResponse {
  return {
    audioUrl,
    playlistId: slot.playlistId ?? null,
    playlistNombre: slot.playlistNombre ?? "Modo DJ",
    djNombre: slot.voz1Nombre ? `DJ ${slot.voz1Nombre}` : "Airon",
  };
}

export async function POST(request: Request): Promise<NextResponse<TransicionSlotResponse | { error: string }>> {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const radio = await prisma.radio.findUnique({
    where: { aireToken: parsed.data.token },
    select: { id: true, aireToken: true },
  });
  if (!radio) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const slot = await resolverSlotDelDia(radio.id, parsed.data.slotId);
  if (!slot?.playlistId) {
    return NextResponse.json({ error: "Slot no encontrado" }, { status: 404 });
  }

  const audioUrl = await generarTransicionSlot(radio.id, slot, radio.aireToken);
  return NextResponse.json(respuestaDesdeSlot(slot, audioUrl));
}

export async function GET(request: NextRequest): Promise<Response> {
  const token = request.nextUrl.searchParams.get("token");
  const slotId = request.nextUrl.searchParams.get("slotId");
  if (!token || !slotId) {
    return NextResponse.json({ error: "token y slotId requeridos" }, { status: 400 });
  }

  const radio = await prisma.radio.findUnique({
    where: { aireToken: token },
    select: { id: true },
  });
  if (!radio) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const path = transicionSlotAudioPath(slotId);
  try {
    await access(path);
  } catch {
    return NextResponse.json({ error: "Audio no disponible" }, { status: 404 });
  }

  const stream = createReadStream(path);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache",
    },
  });
}

export type { TransicionSlotResponse };
