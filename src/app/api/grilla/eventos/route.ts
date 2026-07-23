import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validarCarpetaAudioParaSlot } from "@/lib/audios/validarCarpetaSlot";
import { prisma } from "@/lib/prisma";
import { djInterrupcionesFieldsZ } from "@/lib/grilla/djConfigSchema";
import { horaInicioGrillaZ } from "@/lib/grilla/horaSchema";
import { normalizarPlaylistSlot } from "@/lib/grilla/playlistSlot";
import { validarVocesSlotParaRadio } from "@/lib/grilla/vocesSlot";
import { getSessionRadioId } from "@/lib/session";
import { utcDateFromYmd } from "@/lib/grilla/tiempo";

const grillaVozInclude = {
  voz1: { select: { id: true, nombre: true } },
  voz2: { select: { id: true, nombre: true } },
} as const;

const postEventoSchema = z
  .object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
  const eventos = await prisma.eventoGrilla.findMany({
    where: { radioId },
    include: grillaVozInclude,
    orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
  });
  return NextResponse.json(eventos);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body: unknown = await request.json();
  const parsed = postEventoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const {
    fecha,
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

  const [y, m, d] = fecha.split("-").map(Number);
  if (!y || !m || !d) {
    return NextResponse.json({ error: "fecha invalida" }, { status: 400 });
  }
  const fechaDate = utcDateFromYmd(y, m, d);
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

  const evento = await prisma.eventoGrilla.create({
    data: {
      radioId,
      fecha: fechaDate,
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
  return NextResponse.json(evento, { status: 201 });
}
