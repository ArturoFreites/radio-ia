"use client";

import { ChevronRight } from "lucide-react";
import { Waveform } from "@/components/airon/Waveform";
import { horaFinDesdeInicioYDuracion, horaStringAMinutos, minutosDelDiaActualArgentina } from "@/lib/grilla/tiempo";
import type { SlotHoy } from "@/types/grilla";
import { cn } from "@/lib/utils";

const GRADIENTS = [
  "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
  "linear-gradient(135deg, #0891b2 0%, #6366f1 100%)",
  "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
  "linear-gradient(135deg, #d97706 0%, #dc2626 100%)",
  "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
];

function slotGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % GRADIENTS.length;
  return GRADIENTS[hash] ?? GRADIENTS[0];
}

function nombreSlot(slot: SlotHoy): string {
  return slot.playlistNombre ?? "Modo DJ";
}

function nombreDj(slot: SlotHoy): string {
  return slot.voz1Nombre ?? "DJ";
}

function esSlotPasado(slot: SlotHoy, nowMin: number): boolean {
  const startMin = horaStringAMinutos(slot.horaInicio);
  return startMin + slot.duracionMin <= nowMin;
}

export type ProximosSlotsProps = {
  slots: SlotHoy[];
  slotActivoId: string | null;
  slotSiguienteId: string | null;
  className?: string;
};

export function ProximosSlots({
  slots,
  slotActivoId,
  slotSiguienteId,
  className,
}: ProximosSlotsProps): React.ReactElement {
  const nowMin = minutosDelDiaActualArgentina(new Date());

  return (
    <aside
      className={cn(
        "hidden w-64 shrink-0 flex-col overflow-hidden rounded-[var(--r-lg)] border border-[#1e1e1e] bg-[#0d0d0d] lg:flex",
        className,
      )}
    >
      <div className="border-b border-[#1e1e1e] px-4 py-3">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
          Próximos slots
        </h2>
      </div>

      <ul className="flex-1 space-y-2 overflow-y-auto p-3">
        {slots.map((slot) => {
          const activo = slotActivoId === slot.id;
          const pasado = !activo && slotSiguienteId !== slot.id && esSlotPasado(slot, nowMin);
          const horaFin = horaFinDesdeInicioYDuracion(slot.horaInicio, slot.duracionMin);

          return (
            <li
              key={slot.id}
              className={cn(
                "flex items-center gap-3 rounded-[var(--r-md)] border p-2.5 transition-colors",
                activo
                  ? "border-[color:var(--primary)] bg-[color:var(--primary-glow)]"
                  : "border-[#1e1e1e] bg-[#111]",
                pasado && "opacity-40",
              )}
            >
              <div
                className="h-10 w-10 shrink-0 rounded-[var(--r-sm)]"
                style={{ background: slotGradient(slot.id) }}
              />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] tabular-nums text-[color:var(--muted)]">
                  {slot.horaInicio} – {horaFin}
                </p>
                <p className="truncate text-sm font-semibold text-white">{nombreSlot(slot)}</p>
                <p className="truncate text-[11px] text-[color:var(--muted)]">{nombreDj(slot)}</p>
              </div>
              {activo ? <Waveform active size="sm" color="primary" bars={4} /> : null}
            </li>
          );
        })}
        {slots.length === 0 ? (
          <li className="px-2 py-6 text-center text-xs text-[color:var(--muted)]">Sin slots programados</li>
        ) : null}
      </ul>

      <div className="border-t border-[#1e1e1e] p-3">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 rounded-[var(--r-md)] border border-[#2a2a2a] py-2 text-xs text-[color:var(--muted)] transition-colors hover:border-[#3a3a3a] hover:text-white"
        >
          Ver grilla completa
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
