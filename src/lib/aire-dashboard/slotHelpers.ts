import type { AireQueueTrack } from "@/components/aire-dashboard/AirePlaybackQueue";
import type { AireUpcomingProgram } from "@/components/aire-dashboard/AireUpcomingPrograms";
import { horaFinDesdeInicioYDuracion } from "@/lib/grilla/tiempo";
import type { SlotHoy } from "@/types/grilla";

const GRADIENTS = [
  "linear-gradient(135deg, #0891b2 0%, #6366f1 100%)",
  "linear-gradient(135deg, #d97706 0%, #dc2626 100%)",
  "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
  "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
];

function slotGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % GRADIENTS.length;
  return GRADIENTS[hash] ?? GRADIENTS[0];
}

function nombrePrograma(slot: SlotHoy): string {
  return slot.playlistNombre ?? "Modo DJ";
}

function nombreDj(slot: SlotHoy): string {
  if (slot.voz1Nombre) return `DJ ${slot.voz1Nombre}`;
  return "Automático";
}

export function buildUpcomingFromSlots(
  slots: SlotHoy[],
  slotActivoId: string | null,
  limit = 4,
): AireUpcomingProgram[] {
  return slots
    .filter((s) => s.id !== slotActivoId)
    .slice(0, limit)
    .map((slot) => ({
      id: slot.id,
      titulo: nombrePrograma(slot),
      dj: nombreDj(slot),
      horaInicio: slot.horaInicio,
      duracionMin: slot.duracionMin,
      gradient: slotGradient(slot.id),
    }));
}

export function formatSlotHorario(slot: SlotHoy): string {
  const fin = horaFinDesdeInicioYDuracion(slot.horaInicio, slot.duracionMin);
  return `${slot.horaInicio} - ${fin}`;
}

export function resolveProgramaNombre(slot: SlotHoy | null): string {
  if (!slot) return "Sin programación activa";
  return slot.playlistNombre ?? "Modo DJ";
}

export function resolveDjNombre(slot: SlotHoy | null): string {
  if (!slot?.voz1Nombre) return "Airon";
  return `DJ ${slot.voz1Nombre}`;
}

export function calcularProgresoSlot(
  slot: SlotHoy | null,
  segundosHastaFin: number | null,
): { elapsedSec: number; totalSec: number; progress: number } {
  if (!slot || segundosHastaFin === null) {
    return { elapsedSec: 0, totalSec: 0, progress: 0 };
  }
  const totalSec = slot.duracionMin * 60;
  const elapsedSec = Math.max(0, Math.min(totalSec, totalSec - segundosHastaFin));
  const progress = totalSec > 0 ? elapsedSec / totalSec : 0;
  return { elapsedSec, totalSec, progress };
}

export function formatMsToMmSs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function buildQueueFromTracks(
  current: { id: string; name: string; artists: Array<{ name: string }>; duration_ms: number } | null,
  next: { id: string; name: string; artists: Array<{ name: string }>; duration_ms: number } | null,
): AireQueueTrack[] {
  const tracks: AireQueueTrack[] = [];
  if (current) {
    tracks.push({
      id: current.id,
      titulo: current.name,
      artista: current.artists.map((a) => a.name).join(", "),
      duracion: formatMsToMmSs(current.duration_ms),
      tipo: "spotify",
    });
  }
  if (next && next.id !== current?.id) {
    tracks.push({
      id: next.id,
      titulo: next.name,
      artista: next.artists.map((a) => a.name).join(", "),
      duracion: formatMsToMmSs(next.duration_ms),
      tipo: "spotify",
    });
  }
  return tracks;
}

export function formatHmsFromSeconds(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
