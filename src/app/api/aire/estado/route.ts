import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buscarSpotifySesionParaAire,
  resolverSesionDj,
  toSpotifySesionAire,
} from "@/lib/spotify/sesionAire";
import {
  elegirSlotActivo,
  mergeSlotsDelDiaArgentina,
  segundosHastaFinSlot,
  segundosHastaInicioSlot,
  siguienteSlot,
} from "@/lib/grilla/mergeDia";
import {
  getPartesArgentina,
  horaStringAMinutos,
  segundosDelDiaActualArgentina,
  utcDateFromYmd,
} from "@/lib/grilla/tiempo";
import type { PublicidadAireItem, EstadoAire } from "@/types/grilla";
import { publicidadTieneContenido, wherePublicidadAlAire } from "@/lib/publicidad/filtros";

export async function GET(request: NextRequest): Promise<NextResponse<EstadoAire | { error: string }>> {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token requerido" }, { status: 400 });
  }
  const radio = await prisma.radio.findUnique({
    where: { aireToken: token },
    select: {
      id: true,
      nombre: true,
      ciudad: true,
    },
  });
  if (!radio) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const ahora = new Date();
  const [slotsSemanales, eventos, publicidadesDb, vozFallback] = await Promise.all([
    prisma.slotGrilla.findMany({
      where: { radioId: radio.id },
      include: {
        voz1: { select: { geminiVoiceId: true, nombre: true } },
        voz2: { select: { geminiVoiceId: true, nombre: true } },
      },
    }),
    prisma.eventoGrilla.findMany({
      where: { radioId: radio.id },
      include: {
        voz1: { select: { geminiVoiceId: true, nombre: true } },
        voz2: { select: { geminiVoiceId: true, nombre: true } },
      },
    }),
    prisma.anunciante.findMany({
      where: wherePublicidadAlAire(radio.id),
      select: { id: true, nombre: true, texto: true, audioUrl: true },
    }),
    prisma.radioVoz.findFirst({
      where: { radioId: radio.id, voz: { esActiva: true } },
      select: { voz: { select: { geminiVoiceId: true } } },
    }),
  ]);
  const slots = mergeSlotsDelDiaArgentina(ahora, slotsSemanales, eventos);
  const activo = elegirSlotActivo(slots, ahora);
  let sig = siguienteSlot(slots, ahora);
  let segundosHastaSiguiente: number | null = null;
  if (sig) {
    segundosHastaSiguiente = segundosHastaInicioSlot(sig, ahora);
  } else {
    const partes = getPartesArgentina(ahora);
    const calManana = new Date(Date.UTC(partes.year, partes.month - 1, partes.day, 12, 0, 0, 0));
    calManana.setUTCDate(calManana.getUTCDate() + 1);
    const manana = utcDateFromYmd(
      calManana.getUTCFullYear(),
      calManana.getUTCMonth() + 1,
      calManana.getUTCDate(),
    );
    const slotsManana = mergeSlotsDelDiaArgentina(manana, slotsSemanales, eventos);
    if (slotsManana.length > 0) {
      sig = slotsManana[0] ?? null;
      if (sig) {
        const nowSec = segundosDelDiaActualArgentina(ahora);
        const startSec = horaStringAMinutos(sig.horaInicio) * 60;
        segundosHastaSiguiente = 86400 - nowSec + startSec;
      }
    }
  }

  const publicidades: PublicidadAireItem[] = publicidadesDb
    .filter((item) => publicidadTieneContenido(item.texto, item.audioUrl))
    .map((item) => ({
      id: item.id,
      nombre: item.nombre,
      tieneAudio: Boolean(item.audioUrl),
      tieneTexto: Boolean(item.texto?.trim()),
    }));

  const [spotifySesion, spotifyConexion] = await Promise.all([
    activo?.playlistId
      ? resolverSesionDj(
          radio.id,
          activo.id,
          activo.playlistId,
          activo.playlistNombre ?? "Playlist",
          activo.voz1GeminiId ?? null,
          activo.voz2GeminiId ?? null,
        ).then((s) => (s ? toSpotifySesionAire(s) : buscarSpotifySesionParaAire(radio.id).then((f) => (f ? toSpotifySesionAire(f) : null))))
      : buscarSpotifySesionParaAire(radio.id).then((s) => (s ? toSpotifySesionAire(s) : null)),
    prisma.spotifyConexion.findUnique({
      where: { radioId: radio.id },
      select: { id: true },
    }),
  ]);

  const sinSesionDj = activo !== null && spotifySesion === null && spotifyConexion !== null;

  const vozGeminiId = activo?.voz1GeminiId ?? vozFallback?.voz.geminiVoiceId ?? null;

  const body: EstadoAire = {
    radioNombre: radio.nombre,
    radioCiudad: radio.ciudad,
    slotsDelDia: slots,
    publicidades,
    ahora: activo,
    siguiente: sig,
    segundosHastaFin: activo ? segundosHastaFinSlot(activo, ahora) : null,
    segundosHastaSiguiente,
    spotifySesion,
    sinSesionDj,
    vozGeminiId,
  };
  return NextResponse.json(body);
}
