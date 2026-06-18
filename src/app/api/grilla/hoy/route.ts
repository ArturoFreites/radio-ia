import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mergeSlotsDelDiaArgentina } from "@/lib/grilla/mergeDia";
import { getSessionRadioId } from "@/lib/session";
import type { GrillaHoyResponse } from "@/types/grilla";

export async function GET(): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
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
  const body: GrillaHoyResponse = { slots };
  return NextResponse.json(body);
}
