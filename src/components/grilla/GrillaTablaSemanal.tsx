"use client";

import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { GrillaEditorSlotRow } from "@/types/grilla";
import { clasesBloqueSlot, SLOT_COLOR_CLASSES, variantColorSlot } from "@/lib/grilla/slotColores";
import {
  MINUTOS_TOTAL_DIA,
  PX_PER_MIN,
  layoutSlotsDia,
  minutosAHoraHHMM,
} from "@/lib/grilla/calendarioSlots";
import { horaStringAMinutos } from "@/lib/grilla/tiempo";
import type { DiaSemanaInfo } from "@/lib/grilla/semanaArgentina";
import { LineaHoraActual } from "@/components/grilla/LineaHoraActual";
import { GrillaLeyenda } from "@/components/grilla/GrillaLeyenda";
import { cn } from "@/lib/utils";

const BANDAS_HORARIAS = [6, 9, 12, 15, 18, 21, 0] as const;
const ALTURA_TABLA_PX = MINUTOS_TOTAL_DIA * PX_PER_MIN;

function horaFinEtiqueta(inicioMin: number, duracionMin: number): string {
  const end = inicioMin + duracionMin;
  if (end >= MINUTOS_TOTAL_DIA) return "00:00";
  return minutosAHoraHHMM(end);
}

function tituloSlot(slot: GrillaEditorSlotRow): string {
  return slot.playlistNombre ?? "Sin playlist";
}

function contarInterrupciones(slot: GrillaEditorSlotRow): number {
  let n = 0;
  if (slot.djHoraActiva) n += 1;
  if (slot.djClimaActivo) n += 1;
  if (slot.djPublicidadActiva) n += 1;
  if (slot.presentacionCadaTemas > 0 && slot.voz1) n += 1;
  return n;
}

type TablaSlotBloqueProps = {
  slot: GrillaEditorSlotRow;
  layout: { leftPct: number; widthPct: number };
  enVivo?: boolean;
  onClick: () => void;
};

function TablaSlotBloque({ slot, layout, enVivo, onClick }: TablaSlotBloqueProps): React.ReactElement {
  const topPx = horaStringAMinutos(slot.horaInicio) * PX_PER_MIN;
  const heightPx = slot.duracionMin * PX_PER_MIN;
  const inicioMin = horaStringAMinutos(slot.horaInicio);
  const rango = `${slot.horaInicio}–${horaFinEtiqueta(inicioMin, slot.duracionMin)}`;
  const variant = variantColorSlot(slot);
  const interrupciones = contarInterrupciones(slot);
  const alturaVisible = Math.max(heightPx, 36);

  return (
    <button
      type="button"
      data-slot-chip
      style={{
        top: topPx,
        height: alturaVisible,
        left: `calc(${layout.leftPct}% + 2px)`,
        width: `calc(${layout.widthPct}% - 4px)`,
      }}
      className={cn(
        "group/chip absolute z-10 overflow-hidden rounded-lg border text-left shadow-sm transition hover:brightness-110 hover:shadow-md",
        clasesBloqueSlot(slot),
      )}
      onClick={onClick}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-1", SLOT_COLOR_CLASSES[variant].dot)}
      />
      <div className="flex h-full flex-col px-2 py-1 pl-2.5">
        <div className="flex items-start justify-between gap-1">
          <p className="truncate text-[11px] font-semibold leading-tight">{tituloSlot(slot)}</p>
          {enVivo ? <Badge label="En vivo" pulse variant="live" showDot={false} className="shrink-0 scale-90" /> : null}
        </div>
        {alturaVisible >= 32 ? (
          <p className="mt-0.5 truncate font-mono text-[10px] opacity-80">{rango}</p>
        ) : null}
        {alturaVisible >= 44 && slot.voz1 ? (
          <p className="mt-0.5 truncate text-[10px] opacity-70">{slot.voz1.nombre}</p>
        ) : null}
        {alturaVisible >= 56 ? (
          <div className="mt-auto flex items-center gap-1.5 pt-0.5">
            <span className="rounded-full bg-black/15 px-1.5 py-0 text-[9px] font-medium uppercase tracking-wide opacity-70">
              {slot.duracionMin}m
            </span>
            {interrupciones > 0 ? (
              <span className="text-[9px] opacity-60">{interrupciones} int.</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}

export type GrillaTablaSemanalProps = {
  slots: GrillaEditorSlotRow[];
  dias: DiaSemanaInfo[];
  slotEnVivoId?: string | null;
  onEditarSlot: (slot: GrillaEditorSlotRow) => void;
  onCrearEnDia: (diaDeSemana: number) => void;
  className?: string;
};

export function GrillaTablaSemanal({
  slots,
  dias,
  slotEnVivoId,
  onEditarSlot,
  onCrearEnDia,
  className,
}: GrillaTablaSemanalProps): React.ReactElement {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-soft)]">
              <th className="sticky left-0 z-20 w-14 bg-[color:var(--surface-soft)] px-2 py-3" scope="col" />
              {dias.map((dia) => (
                <th
                  key={dia.diaDeSemana}
                  scope="col"
                  className={cn(
                    "min-w-[100px] border-l border-[color:var(--border)] px-2 py-3 text-center",
                    dia.esHoy && "border-b-2 border-b-[color:var(--danger)]/50 bg-[color:var(--primary)]/8",
                  )}
                >
                  <span
                    className={cn(
                      "block text-[10px] font-semibold uppercase tracking-wider",
                      dia.esHoy ? "text-[color:var(--primary)]" : "text-[color:var(--muted)]",
                    )}
                  >
                    {dia.etiquetaCorta}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-xl font-bold tabular-nums",
                      dia.esHoy ? "text-[color:var(--text)]" : "text-[color:var(--text)]/75",
                    )}
                  >
                    {dia.numero}
                  </span>
                  {dia.esHoy ? (
                    <span className="mt-1 inline-block rounded-full bg-[color:var(--danger)]/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[color:var(--danger)]">
                      Hoy
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                className="sticky left-0 z-20 w-14 align-top border-r border-[color:var(--border)] bg-[color:var(--surface-soft)] p-0"
                style={{ height: ALTURA_TABLA_PX }}
              >
                <div className="relative h-full">
                  {BANDAS_HORARIAS.map((h) => {
                    const top = h === 0 ? 21 * 60 * PX_PER_MIN : h * 60 * PX_PER_MIN;
                    const label = h === 0 ? "00:00" : `${String(h).padStart(2, "0")}:00`;
                    return (
                      <span
                        key={h}
                        className="absolute right-2 font-mono text-[10px] text-[color:var(--muted)]"
                        style={{ top }}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </td>
              {dias.map((dia) => {
                const lista = slots.filter((s) => s.diaDeSemana === dia.diaDeSemana);
                const layoutMap = layoutSlotsDia(lista);
                return (
                  <td
                    key={dia.diaDeSemana}
                    className={cn(
                      "group/col relative border-l border-[color:var(--border)] p-0 align-top transition-colors",
                      dia.esHoy && "bg-[color:var(--primary)]/[0.04]",
                    )}
                    style={{ height: ALTURA_TABLA_PX }}
                  >
                    <div
                      className="relative h-full w-full"
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("[data-slot-chip]")) return;
                        onCrearEnDia(dia.diaDeSemana);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !(e.target as HTMLElement).closest("[data-slot-chip]")) {
                          onCrearEnDia(dia.diaDeSemana);
                        }
                      }}
                    >
                      {lista.length === 0 ? (
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-2 text-center opacity-0 transition-opacity group-hover/col:opacity-100">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[color:var(--border)] bg-[color:var(--surface-soft)]">
                            <Plus className="h-4 w-4 text-[color:var(--muted)]" aria-hidden />
                          </span>
                          <p className="text-[11px] text-[color:var(--muted)]">Clic para crear slot</p>
                        </div>
                      ) : null}
                      {lista.map((slot) => (
                        <TablaSlotBloque
                          key={slot.id}
                          slot={slot}
                          layout={layoutMap.get(slot.id) ?? { leftPct: 0, widthPct: 100 }}
                          enVivo={slot.id === slotEnVivoId}
                          onClick={() => onEditarSlot(slot)}
                        />
                      ))}
                      {dia.esHoy ? <LineaHoraActual visible /> : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <GrillaLeyenda />
    </div>
  );
}
