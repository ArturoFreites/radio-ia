"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontal } from "lucide-react";
import { SpotifyIcon } from "@/components/brand/SpotifyIcon";
import { useCallback, useRef, useState } from "react";
import type { GrillaEditorSlotRow } from "@/types/grilla";
import { horaStringAMinutos } from "@/lib/grilla/tiempo";
import type { LayoutCeldaSlot } from "@/lib/grilla/calendarioSlots";
import {
  MINUTOS_SLOT_MINIMO,
  MINUTOS_TOTAL_DIA,
  PX_PER_MIN,
  minutosAHoraHHMM,
  snapMinutosA15,
} from "@/lib/grilla/calendarioSlots";
import { calcularInterrupcionesProyectadas, leyendaInterrupciones } from "@/lib/grilla/interrupcionesProyectadas";
import { djConfigFromRow } from "@/lib/grilla/djConfigSchema";
import type { TipoInterrupcionDj } from "@/types/grilla";
import { cn } from "@/lib/utils";
import { clasesBloqueSlot } from "@/lib/grilla/slotColores";

export const SLOT_DRAG_ID_PREFIX = "slot:";

export function slotDragId(slotId: string): string {
  return `${SLOT_DRAG_ID_PREFIX}${slotId}`;
}

const COLOR_INTERRUPCION: Record<TipoInterrupcionDj, string> = {
  HORA: "bg-sky-400",
  CLIMA: "bg-cyan-400",
  PUBLICIDAD: "bg-rose-400",
  AUDIO: "bg-amber-400",
  TEXTO: "bg-violet-400",
};

function horaFinEtiqueta(inicioMin: number, duracionMin: number): string {
  const end = inicioMin + duracionMin;
  if (end >= MINUTOS_TOTAL_DIA) return "24:00";
  return minutosAHoraHHMM(end);
}

function rangoEtiqueta(horaInicio: string, duracionMin: number): string {
  const start = horaStringAMinutos(horaInicio);
  return `${horaInicio}–${horaFinEtiqueta(start, duracionMin)}`;
}

function tituloSlot(slot: GrillaEditorSlotRow): string {
  if (slot.playlistNombre) return slot.playlistNombre;
  return "DJ — sin playlist";
}

function subtituloDjMuted(slot: GrillaEditorSlotRow): boolean {
  return !slot.playlistNombre;
}

function lineaVocesDj(slot: GrillaEditorSlotRow): string | null {
  if (slot.voz1) return slot.voz1.nombre;
  return "sin diálogo IA";
}

function FranjasInterrupcion({
  slot,
  duracionMin,
}: {
  slot: GrillaEditorSlotRow;
  duracionMin: number;
}): React.ReactElement | null {
  const interrupciones = calcularInterrupcionesProyectadas(duracionMin, djConfigFromRow(slot));
  if (interrupciones.length === 0) return null;
  return (
    <>
      {interrupciones.map((i) => (
        <div
          key={`${i.tipo}-${i.offsetMin}`}
          className={cn("pointer-events-none absolute left-0 right-0 h-1 opacity-90", COLOR_INTERRUPCION[i.tipo])}
          style={{ top: i.offsetMin * PX_PER_MIN }}
          title={i.tipo}
        />
      ))}
    </>
  );
}

type SlotBloquePreviewProps = {
  slot: GrillaEditorSlotRow;
  layout: LayoutCeldaSlot;
  duracionMinOverride?: number;
  className?: string;
};

export function SlotBloquePreview({ slot, layout, duracionMinOverride, className }: SlotBloquePreviewProps): React.ReactElement {
  const topPx = horaStringAMinutos(slot.horaInicio) * PX_PER_MIN;
  const dur = duracionMinOverride ?? slot.duracionMin;
  const heightPx = dur * PX_PER_MIN;
  const leyenda = leyendaInterrupciones(djConfigFromRow(slot));
  return (
    <div
      style={{
        top: topPx,
        height: heightPx,
        left: `${layout.leftPct}%`,
        width: `${layout.widthPct}%`,
      }}
      className={cn(
        "absolute box-border overflow-hidden rounded-lg border px-1 py-0.5 text-[11px] leading-tight shadow-lg select-none",
        clasesBloqueSlot(slot),
        className,
      )}
    >
      <FranjasInterrupcion slot={slot} duracionMin={dur} />
      <div className={cn("truncate text-[11px] font-semibold", subtituloDjMuted(slot) && "text-amber-200/50")}>
        {tituloSlot(slot)}
      </div>
      <div className="truncate font-mono text-[10px] opacity-80">{rangoEtiqueta(slot.horaInicio, dur)}</div>
      {heightPx >= 40 ? (
        <p className={cn("truncate text-[10px]", subtituloDjMuted(slot) ? "text-amber-200/40" : "text-amber-100/70")}>
          {lineaVocesDj(slot)}
          {leyenda ? ` · ${leyenda}` : ""}
        </p>
      ) : null}
      {heightPx >= 52 ? (
        <span className="mt-0.5 inline-flex items-center gap-0.5 truncate rounded-full bg-white/10 px-1.5 py-0 text-[9px] font-medium uppercase tracking-wide text-white/40">
          <SpotifyIcon branded={false} className="h-2.5 w-2.5 text-white/60" size="xs" />
          DJ
        </span>
      ) : null}
    </div>
  );
}

type SlotBloqueProps = {
  slot: GrillaEditorSlotRow;
  layout: LayoutCeldaSlot;
  onClickEditar?: (anchorRect: DOMRect) => void;
  onResizeCommit?: (slotId: string, nuevaDuracionMin: number) => void;
};

export function SlotBloque({ slot, layout, onClickEditar, onResizeCommit }: SlotBloqueProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: slotDragId(slot.id),
    data: { slot },
  });

  const topPx = horaStringAMinutos(slot.horaInicio) * PX_PER_MIN;

  const resizeActive = useRef(false);
  const startY = useRef(0);
  const startDur = useRef(0);
  const [previewDur, setPreviewDur] = useState<number | null>(null);

  const duracionVisible = previewDur ?? slot.duracionMin;
  const heightVisible = duracionVisible * PX_PER_MIN;
  const mostrarBadgeTipo = heightVisible >= 52;
  const leyenda = leyendaInterrupciones(djConfigFromRow(slot));

  const transformStr = transform ? CSS.Translate.toString(transform) : undefined;

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      if (!onResizeCommit) return;
      e.preventDefault();
      e.stopPropagation();
      resizeActive.current = true;
      startY.current = e.clientY;
      startDur.current = slot.duracionMin;
      setPreviewDur(slot.duracionMin);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [onResizeCommit, slot.duracionMin],
  );

  const onResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      if (!resizeActive.current || !onResizeCommit) return;
      const deltaMin = Math.round((e.clientY - startY.current) / PX_PER_MIN);
      const raw = startDur.current + deltaMin;
      const snapped = snapMinutosA15(raw);
      const inicioMin = horaStringAMinutos(slot.horaInicio);
      const maxDur = MINUTOS_TOTAL_DIA - inicioMin;
      const clamped = Math.max(MINUTOS_SLOT_MINIMO, Math.min(maxDur, snapped));
      setPreviewDur(clamped);
    },
    [onResizeCommit, slot.horaInicio],
  );

  const onResizePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      if (!resizeActive.current || !onResizeCommit) return;
      resizeActive.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const finalDur = previewDur ?? slot.duracionMin;
      setPreviewDur(null);
      if (finalDur !== slot.duracionMin) {
        onResizeCommit(slot.id, finalDur);
      }
    },
    [onResizeCommit, previewDur, slot.duracionMin, slot.id],
  );

  return (
    <div
      ref={setNodeRef}
      data-slot-block
      style={{
        top: topPx,
        height: heightVisible,
        left: `${layout.leftPct}%`,
        width: `${layout.widthPct}%`,
        transform: transformStr,
        zIndex: isDragging ? 25 : 10,
      }}
      className={cn(
        "group/slot absolute box-border overflow-hidden rounded-lg border px-1 py-0.5 text-[11px] leading-tight shadow-sm select-none",
        clasesBloqueSlot(slot),
        isDragging && "opacity-40",
      )}
      {...listeners}
      {...attributes}
      onClick={(ev) => {
        if (resizeActive.current) return;
        ev.stopPropagation();
        onClickEditar?.((ev.currentTarget as HTMLElement).getBoundingClientRect());
      }}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          const el = ev.currentTarget as HTMLElement;
          onClickEditar?.(el.getBoundingClientRect());
        }
      }}
      role="button"
      tabIndex={0}
    >
      <FranjasInterrupcion slot={slot} duracionMin={duracionVisible} />
      <div className={cn("truncate text-[11px] font-semibold", subtituloDjMuted(slot) && "text-amber-200/50")}>
        {tituloSlot(slot)}
      </div>
      <div className="truncate font-mono text-[10px] opacity-80">{rangoEtiqueta(slot.horaInicio, duracionVisible)}</div>
      {heightVisible >= 40 ? (
        <p className={cn("truncate text-[10px]", subtituloDjMuted(slot) ? "text-amber-200/40" : "text-amber-100/70")}>
          {lineaVocesDj(slot)}
          {leyenda ? ` · ${leyenda}` : ""}
        </p>
      ) : null}
      {mostrarBadgeTipo ? (
        <span className="mt-0.5 inline-flex items-center gap-0.5 truncate rounded-full bg-white/10 px-1.5 py-0 text-[9px] font-medium uppercase tracking-wide text-white/40">
          <SpotifyIcon branded={false} className="h-2.5 w-2.5 text-white/60" size="xs" />
          DJ
        </span>
      ) : null}
      {onResizeCommit ? (
        <div
          className="absolute bottom-0 left-0 right-0 flex h-3 cursor-ns-resize items-end justify-center rounded-b opacity-0 transition-opacity group-hover/slot:opacity-100"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
        >
          <GripHorizontal className="h-2.5 w-2.5 text-zinc-400" aria-hidden />
        </div>
      ) : null}
    </div>
  );
}
