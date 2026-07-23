import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validarCarpetaAudioParaSlot } from "@/lib/audios/validarCarpetaSlot";
import { prisma } from "@/lib/prisma";
import { djInterrupcionesFieldsZ } from "@/lib/grilla/djConfigSchema";
import { horaInicioGrillaZ } from "@/lib/grilla/horaSchema";
import { normalizarPlaylistSlot } from "@/lib/grilla/playlistSlot";
import { validarVocesSlotParaRadio } from "@/lib/grilla/vocesSlot";
import { getSessionRadioId } from "@/lib/session";

const grillaVozInclude = {
  voz1: { select: { id: true, nombre: true } },
  voz2: { select: { id: true, nombre: true } },
} as const;

const postSlotSchema = z
  .object({
    diaDeSemana: z.number().int().min(0).max(6),
    horaInicio: horaInicioGrillaZ,
    duracionMin: z.number().int().min(5),
    playlistId: z.string().nullable().optional(),
    playlistNombre: z.string().nullable().optional(),
    voz1Id: z.string().cuid().nullable().optional(),
    voz2Id: z.string().cuid().nullable().optional(),
  })
  .merge(djInterrupcionesFieldsZ);

export async function GET(): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const slots = await prisma.slotGrilla.findMany({
    where: { radioId },
    include: grillaVozInclude,
    orderBy: [{ diaDeSemana: "asc" }, { horaInicio: "asc" }],
  });
  return NextResponse.json(slots);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body: unknown = await request.json();
  const parsed = postSlotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const {
    diaDeSemana,
    horaInicio,
    duracionMin,
    playlistId,
    playlistNombre,
    voz1Id,
    voz2Id,
    presentacionCadaTemas,
    djHoraActiva,
    djHoraIntervaloMin,
    djClimaActivo,
    djClimaIntervaloMin,
    djPublicidadActiva,
    djPublicidadIntervaloMin,
    djAudioActiva,
    djAudioIntervaloMin,
    djAudioCarpetaId,
    djTextoActiva,
    djTextoIntervaloMin,
    djTextoContenido,
  } = parsed.data;

  const playlist = normalizarPlaylistSlot(playlistId, playlistNombre);

  const vocesValidadas = await validarVocesSlotParaRadio(radioId, voz1Id, voz2Id);
  if ("error" in vocesValidadas) {
    return NextResponse.json({ error: vocesValidadas.error }, { status: 400 });
  }

  const audioActiva = djAudioActiva ?? false;
  const carpetaValidada = await validarCarpetaAudioParaSlot(radioId, djAudioCarpetaId, audioActiva);
  if (!carpetaValidada.ok) {
    return NextResponse.json({ error: carpetaValidada.error }, { status: 400 });
  }

  const textoActiva = djTextoActiva ?? false;
  const textoContenido = textoActiva ? (djTextoContenido?.trim() ?? null) : null;

  const slot = await prisma.slotGrilla.create({
    data: {
      radioId,
      diaDeSemana,
      horaInicio,
      duracionMin,
      tipo: "DJ",
      playlistId: playlist.playlistId,
      playlistNombre: playlist.playlistNombre,
      voz1Id: vocesValidadas.voz1Id,
      voz2Id: vocesValidadas.voz2Id,
      presentacionCadaTemas: presentacionCadaTemas ?? 1,
      djHoraActiva: djHoraActiva ?? false,
      djHoraIntervaloMin: djHoraActiva ? (djHoraIntervaloMin ?? null) : null,
      djClimaActivo: djClimaActivo ?? false,
      djClimaIntervaloMin: djClimaActivo ? (djClimaIntervaloMin ?? null) : null,
      djPublicidadActiva: djPublicidadActiva ?? false,
      djPublicidadIntervaloMin: djPublicidadActiva ? (djPublicidadIntervaloMin ?? null) : null,
      djAudioActiva: audioActiva,
      djAudioIntervaloMin: audioActiva ? (djAudioIntervaloMin ?? null) : null,
      djAudioCarpetaId: carpetaValidada.carpetaId,
      djTextoActiva: textoActiva,
      djTextoIntervaloMin: textoActiva ? (djTextoIntervaloMin ?? null) : null,
      djTextoContenido: textoContenido,
    },
    include: grillaVozInclude,
  });
  return NextResponse.json(slot, { status: 201 });
}
