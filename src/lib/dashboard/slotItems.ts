import {
  horaFinDesdeInicioYDuracion,
  horaStringAMinutos,
  isoHoraInicioArgentina,
  minutosDelDiaActualArgentina,
} from "@/lib/grilla/tiempo";
import type { SlotHoy } from "@/types/grilla";

export type DashboardSlotItem = {
  id: string;
  nombre: string;
  djNombre: string;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
  pasado: boolean;
  countdownTargetIso?: string | null;
};

export function buildDashboardSlotItems(
  slots: SlotHoy[],
  activoId: string | null,
  ahora: Date,
): DashboardSlotItem[] {
  const nowMin = minutosDelDiaActualArgentina(ahora);

  return slots.map((slot) => {
    const startMin = horaStringAMinutos(slot.horaInicio);
    const endMin = startMin + slot.duracionMin;
    const activo = slot.id === activoId;
    const pasado = !activo && endMin <= nowMin;
    const horaFin = horaFinDesdeInicioYDuracion(slot.horaInicio, slot.duracionMin);

    let countdownTargetIso: string | null = null;
    if (activo) {
      countdownTargetIso = isoHoraInicioArgentina(ahora, horaFin);
    } else if (!pasado && startMin > nowMin) {
      countdownTargetIso = isoHoraInicioArgentina(ahora, slot.horaInicio);
    }

    return {
      id: slot.id,
      nombre: slot.playlistNombre ?? "Modo DJ",
      djNombre: slot.voz1Nombre ?? "DJ",
      horaInicio: slot.horaInicio,
      horaFin,
      activo,
      pasado,
      countdownTargetIso,
    };
  });
}
