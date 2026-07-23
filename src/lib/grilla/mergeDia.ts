import type { EventoGrilla, SlotGrilla, Voz } from "@prisma/client";
import { djConfigFromRow } from "@/lib/grilla/djConfigSchema";
import type { SlotHoy } from "@/types/grilla";
import {
  fechaCalendarArgentinaIgual,
  getPartesArgentina,
  horaStringAMinutos,
  minutosDelDiaActualArgentina,
  segundosDelDiaActualArgentina,
} from "@/lib/grilla/tiempo";

type VozResumen = Pick<Voz, "geminiVoiceId" | "nombre">;

export type SlotGrillaConVoces = SlotGrilla & {
  voz1: VozResumen | null;
  voz2: VozResumen | null;
};

export type EventoGrillaConVoces = EventoGrilla & {
  voz1: VozResumen | null;
  voz2: VozResumen | null;
};

type Intervalo = { startMin: number; endMin: number };

function getIntervalo(horaInicio: string, duracionMin: number): Intervalo {
  const startMin = horaStringAMinutos(horaInicio);
  const endMin = startMin + duracionMin;
  return { startMin, endMin };
}

function seSolapan(a: Intervalo, b: Intervalo): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

type FilaGrillaDj = {
  playlistId: string | null;
  playlistNombre: string | null;
  voz1: VozResumen | null;
  voz2: VozResumen | null;
} & ReturnType<typeof djConfigFromRow>;

function filaDjDesdeRegistro(
  row: {
    playlistId: string | null;
    playlistNombre: string | null;
    voz1: VozResumen | null;
    voz2: VozResumen | null;
    presentacionCadaTemas: number;
    djHoraActiva: boolean;
    djHoraIntervaloMin: number | null;
    djClimaActivo: boolean;
    djClimaIntervaloMin: number | null;
    djPublicidadActiva: boolean;
    djPublicidadIntervaloMin: number | null;
    djAudioActiva: boolean;
    djAudioIntervaloMin: number | null;
    djAudioCarpetaId: string | null;
    djTextoActiva: boolean;
    djTextoIntervaloMin: number | null;
    djTextoContenido: string | null;
  },
): FilaGrillaDj {
  return {
    playlistId: row.playlistId,
    playlistNombre: row.playlistNombre,
    voz1: row.voz1,
    voz2: row.voz2,
    ...djConfigFromRow(row),
  };
}

function toSlotHoy(
  id: string,
  horaInicio: string,
  duracionMin: number,
  origen: "slot" | "evento",
  dj: FilaGrillaDj,
): SlotHoy {
  const out: SlotHoy = {
    id,
    tipo: "DJ",
    horaInicio,
    duracionMin,
    origen,
    presentacionCadaTemas: dj.presentacionCadaTemas,
    djHoraActiva: dj.djHoraActiva,
    djHoraIntervaloMin: dj.djHoraIntervaloMin,
    djClimaActivo: dj.djClimaActivo,
    djClimaIntervaloMin: dj.djClimaIntervaloMin,
    djPublicidadActiva: dj.djPublicidadActiva,
    djPublicidadIntervaloMin: dj.djPublicidadIntervaloMin,
    djAudioActiva: dj.djAudioActiva,
    djAudioIntervaloMin: dj.djAudioIntervaloMin,
    djAudioCarpetaId: dj.djAudioCarpetaId,
    djTextoActiva: dj.djTextoActiva,
    djTextoIntervaloMin: dj.djTextoIntervaloMin,
    djTextoContenido: dj.djTextoContenido,
  };
  if (dj.playlistId) {
    out.playlistId = dj.playlistId;
    out.playlistNombre = dj.playlistNombre ?? undefined;
  }
  if (dj.voz1) {
    out.voz1GeminiId = dj.voz1.geminiVoiceId;
    out.voz1Nombre = dj.voz1.nombre;
  }
  if (dj.voz2) {
    out.voz2GeminiId = dj.voz2.geminiVoiceId;
    out.voz2Nombre = dj.voz2.nombre;
  }
  return out;
}

export function mergeSlotsDelDiaArgentina(
  ahora: Date,
  slotsSemanales: SlotGrillaConVoces[],
  eventos: EventoGrillaConVoces[],
): SlotHoy[] {
  const partes = getPartesArgentina(ahora);
  const weekday = partes.weekday0Sun;

  const eventosHoy = eventos.filter((e) => fechaCalendarArgentinaIgual(e.fecha, partes));
  const slotsDia = slotsSemanales.filter((s) => s.esActivo && s.diaDeSemana === weekday);

  const intervalosEvento = eventosHoy.map((e) => getIntervalo(e.horaInicio, e.duracionMin));

  const slotsSinOverride = slotsDia.filter((s) => {
    const iv = getIntervalo(s.horaInicio, s.duracionMin);
    return !intervalosEvento.some((ev) => seSolapan(iv, ev));
  });

  const mappedEventos = eventosHoy.map((e) =>
    toSlotHoy(`evt_${e.id}`, e.horaInicio, e.duracionMin, "evento", filaDjDesdeRegistro(e)),
  );
  const mappedSemanales = slotsSinOverride.map((s) =>
    toSlotHoy(`slot_${s.id}`, s.horaInicio, s.duracionMin, "slot", filaDjDesdeRegistro(s)),
  );

  const combinados = [...mappedEventos, ...mappedSemanales];
  combinados.sort((a, b) => horaStringAMinutos(a.horaInicio) - horaStringAMinutos(b.horaInicio));
  return combinados;
}

export function elegirSlotActivo(slots: SlotHoy[], ahora: Date): SlotHoy | null {
  const nowMin = minutosDelDiaActualArgentina(ahora);
  const candidatos = slots.filter((s) => {
    const { startMin, endMin } = getIntervalo(s.horaInicio, s.duracionMin);
    return nowMin >= startMin && nowMin < endMin;
  });
  if (candidatos.length === 0) return null;
  candidatos.sort((a, b) => horaStringAMinutos(a.horaInicio) - horaStringAMinutos(b.horaInicio));
  return candidatos[0] ?? null;
}

export function siguienteSlot(slots: SlotHoy[], ahora: Date): SlotHoy | null {
  const nowMin = minutosDelDiaActualArgentina(ahora);
  const futuros = slots.filter((s) => horaStringAMinutos(s.horaInicio) > nowMin);
  if (futuros.length === 0) return null;
  futuros.sort((a, b) => horaStringAMinutos(a.horaInicio) - horaStringAMinutos(b.horaInicio));
  return futuros[0] ?? null;
}

export function segundosHastaFinSlot(slot: SlotHoy, ahora: Date): number | null {
  const nowSec = segundosDelDiaActualArgentina(ahora);
  const startMin = horaStringAMinutos(slot.horaInicio);
  const startSec = startMin * 60;
  const endSec = startSec + slot.duracionMin * 60;
  if (nowSec < startSec || nowSec >= endSec) return null;
  return endSec - nowSec;
}

export function segundosHastaInicioSlot(slot: SlotHoy, ahora: Date): number | null {
  const nowSec = segundosDelDiaActualArgentina(ahora);
  const startMin = horaStringAMinutos(slot.horaInicio);
  const startSec = startMin * 60;
  if (nowSec >= startSec) return null;
  return startSec - nowSec;
}
