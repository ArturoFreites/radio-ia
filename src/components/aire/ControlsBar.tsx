"use client";

import { useEffect, useState } from "react";
import type { ModoAire, SlotHoy } from "@/types/grilla";

function formatMMSS(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function nombreSlot(slot: SlotHoy): string {
  return slot.playlistNombre ?? "Modo DJ";
}

export type ControlsBarProps = {
  modo: ModoAire;
  onDemoPublicidad: () => void;
  segundosHastaFin: number | null;
  siguienteSlot: SlotHoy | null;
  segundosHastaSiguiente: number | null;
  transmision?: React.ReactNode;
};

export function ControlsBar({
  modo,
  onDemoPublicidad,
  segundosHastaFin,
  siguienteSlot,
  segundosHastaSiguiente,
  transmision,
}: ControlsBarProps): React.ReactElement {
  const [localFin, setLocalFin] = useState<number | null>(segundosHastaFin);
  const [localSiguiente, setLocalSiguiente] = useState<number | null>(segundosHastaSiguiente);

  useEffect(() => {
    setLocalFin(segundosHastaFin);
  }, [segundosHastaFin]);

  useEffect(() => {
    setLocalSiguiente(segundosHastaSiguiente);
  }, [segundosHastaSiguiente]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLocalFin((f) => (f !== null && f > 0 ? f - 1 : f));
      setLocalSiguiente((s) => (s !== null && s > 0 ? s - 1 : s));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const haySlotActivo = segundosHastaFin !== null;

  let izquierda: string;
  if (haySlotActivo && localFin !== null) {
    izquierda = `Slot termina en ${formatMMSS(localFin)}`;
  } else {
    izquierda = "";
  }

  let derecha: string;
  if (!siguienteSlot) {
    derecha = "Sin programación posterior";
  } else if (haySlotActivo) {
    derecha = `Siguiente: ${nombreSlot(siguienteSlot)} a las ${siguienteSlot.horaInicio}`;
  } else if (localSiguiente !== null) {
    derecha = `Siguiente: ${nombreSlot(siguienteSlot)} en ${formatMMSS(localSiguiente)}`;
  } else {
    derecha = `Siguiente: ${nombreSlot(siguienteSlot)} a las ${siguienteSlot.horaInicio}`;
  }

  const botonCabinaClass =
    "text-xs text-zinc-300 transition-[background,border-color] hover:border-[#333] hover:bg-[#1a1a1a]";

  void modo;

  return (
    <div
      className="pointer-events-auto border-t border-[#111] backdrop-blur-[16px]"
      style={{ background: "rgba(0,0,0,.65)" }}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-1.5 text-xs text-zinc-300 md:gap-3">
        <span className="min-w-0 shrink-0 tabular-nums text-amber-400/90">{izquierda || "\u00a0"}</span>
        <span className="hidden flex-1 md:inline" />
        <span className="min-w-0 max-w-[50vw] shrink truncate text-right text-zinc-400 md:max-w-none">
          {derecha}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-2 md:gap-2">
        {transmision}
        <button
          type="button"
          onClick={onDemoPublicidad}
          className={`${botonCabinaClass} min-h-11 rounded-[var(--r-md)] border border-[#222] bg-[#0d0d0d] px-4 py-2.5 md:px-3 md:py-1.5`}
        >
          <span className="md:hidden">📢 Demo</span>
          <span className="hidden md:inline">Demo publicidad</span>
        </button>
      </div>
    </div>
  );
}
