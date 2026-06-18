"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { GrillaEditorSlotRow } from "@/types/grilla";
import { getPartesArgentina } from "@/lib/grilla/tiempo";
import {
  MINUTOS_TOTAL_DIA,
  PX_PER_MIN,
  layoutSlotsDia,
  minutosAHoraHHMM,
  snapMinutosA15,
} from "@/lib/grilla/calendarioSlots";
import { LineaHoraActual } from "@/components/grilla/LineaHoraActual";
import { SlotBloque, SlotBloquePreview } from "@/components/grilla/SlotBloque";
import { SlotPopover } from "@/components/grilla/SlotPopover";
import type { SlotFormTarget } from "@/components/grilla/SlotForm";
import { cn } from "@/lib/utils";

const DIAS_ORDEN: Array<{ valor: number; etiqueta: string }> = [
  { valor: 1, etiqueta: "Lun" },
  { valor: 2, etiqueta: "Mar" },
  { valor: 3, etiqueta: "Mie" },
  { valor: 4, etiqueta: "Jue" },
  { valor: 5, etiqueta: "Vie" },
  { valor: 6, etiqueta: "Sab" },
  { valor: 0, etiqueta: "Dom" },
];

const DAY_PREFIX = "day:";

function dayDroppableId(dia: number): string {
  return `${DAY_PREFIX}${dia}`;
}

function parseDayDroppableId(id: UniqueIdentifier): number | null {
  const s = String(id);
  if (!s.startsWith(DAY_PREFIX)) return null;
  const n = Number(s.slice(DAY_PREFIX.length));
  return Number.isFinite(n) ? n : null;
}

function parseSlotDragId(id: UniqueIdentifier): string | null {
  const s = String(id);
  if (!s.startsWith("slot:")) return null;
  return s.slice(5) || null;
}

function diasMobileTres(): Array<{ valor: number; etiqueta: string }> {
  const wd = getPartesArgentina(new Date()).weekday0Sun;
  const valores = [wd, (wd + 1) % 7, (wd + 2) % 7];
  return valores.map((valor) => {
    const row = DIAS_ORDEN.find((d) => d.valor === valor);
    return row ?? { valor, etiqueta: String(valor) };
  });
}

type PointerPos = { x: number; y: number };

type DroppableDayTrackProps = {
  dia: number;
  esHoy: boolean;
  heightPx: number;
  children: React.ReactNode;
  trackRef: (dia: number, el: HTMLElement | null) => void;
  onTrackPointerDown: (e: React.PointerEvent<HTMLElement>, dia: number) => void;
  onTrackPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onTrackPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  mobile: boolean;
};

function DroppableDayTrack({
  dia,
  esHoy,
  heightPx,
  children,
  trackRef,
  onTrackPointerDown,
  onTrackPointerMove,
  onTrackPointerUp,
  mobile,
}: DroppableDayTrackProps): React.ReactElement {
  const { setNodeRef, isOver } = useDroppable({ id: dayDroppableId(dia) });
  return (
    <div
      ref={setNodeRef}
      style={{ minHeight: heightPx }}
      className={cn(
        "relative min-h-0 border-l border-[color:var(--border)]",
        esHoy && "bg-[color:var(--primary)]/[0.04]",
        mobile ? "min-w-[82vw] shrink-0 snap-start md:min-w-0" : "flex-1",
        isOver && "bg-[color:var(--primary)]/5",
      )}
    >
      <div
        ref={(el) => {
          trackRef(dia, el);
        }}
        data-day-track
        className="relative touch-none select-none"
        style={{ height: heightPx }}
        onPointerDown={(e) => onTrackPointerDown(e, dia)}
        onPointerMove={onTrackPointerMove}
        onPointerUp={onTrackPointerUp}
        onPointerCancel={onTrackPointerUp}
      >
        {children}
      </div>
    </div>
  );
}

export type CalendarioSemanalProps = {
  slots: GrillaEditorSlotRow[];
  onCambio: () => Promise<void>;
  onNuevoSlot?: (target: SlotFormTarget) => void;
  onEditarSlot?: (slot: GrillaEditorSlotRow) => void;
};

export function CalendarioSemanal({
  slots,
  onCambio,
  onNuevoSlot,
  onEditarSlot,
}: CalendarioSemanalProps): React.ReactElement {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const fn = (): void => setMobile(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const diasAMostrar = useMemo(() => (mobile ? diasMobileTres() : DIAS_ORDEN), [mobile]);

  const heightPx = MINUTOS_TOTAL_DIA * PX_PER_MIN;
  const scrollRef = useRef<HTMLDivElement>(null);
  const weekdayHoyArgentina = getPartesArgentina(new Date()).weekday0Sun;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { hour } = getPartesArgentina(new Date());
    const startMin = Math.max(0, hour * 60 - 60);
    el.scrollTop = startMin * PX_PER_MIN;
  }, [mobile]);

  const dayTracksRef = useRef<Map<number, HTMLElement>>(new Map());
  const trackRef = useCallback((dia: number, el: HTMLElement | null) => {
    if (el) dayTracksRef.current.set(dia, el);
    else dayTracksRef.current.delete(dia);
  }, []);

  const pointerDuringDragRef = useRef<PointerPos>({ x: 0, y: 0 });
  const dragPointerCleanupRef = useRef<(() => void) | null>(null);

  const [popover, setPopover] = useState<null | { anchorRect: DOMRect; target: SlotFormTarget }>(null);

  const draftRef = useRef<null | {
    dia: number;
    pointerId: number;
    startMin: number;
    lastMin: number;
    track: HTMLElement;
  }>(null);
  const [draftVisual, setDraftVisual] = useState<null | { dia: number; startMin: number; endMin: number }>(null);

  const [dragOverlay, setDragOverlay] = useState<null | { slot: GrillaEditorSlotRow; layout: { leftPct: number; widthPct: number } }>(
    null,
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const onDragStart = useCallback(
    (e: DragStartEvent): void => {
      const sid = parseSlotDragId(e.active.id);
      const slot = sid ? slots.find((s) => s.id === sid) : undefined;
      if (slot) {
        const daySlots = slots.filter((s) => s.diaDeSemana === slot.diaDeSemana);
        const lm = layoutSlotsDia(daySlots);
        const layout = lm.get(slot.id) ?? { leftPct: 0, widthPct: 100 };
        setDragOverlay({ slot, layout });
      }
      const ev = e.activatorEvent;
      if ("clientY" in ev && typeof (ev as PointerEvent).clientY === "number") {
        const pe = ev as PointerEvent;
        pointerDuringDragRef.current = { x: pe.clientX, y: pe.clientY };
      }
      const move = (pe: PointerEvent): void => {
        pointerDuringDragRef.current = { x: pe.clientX, y: pe.clientY };
      };
      window.addEventListener("pointermove", move);
      dragPointerCleanupRef.current = () => window.removeEventListener("pointermove", move);
    },
    [slots],
  );

  const onDragEnd = useCallback(
    async (e: DragEndEvent): Promise<void> => {
      dragPointerCleanupRef.current?.();
      dragPointerCleanupRef.current = null;
      setDragOverlay(null);
      const sid = parseSlotDragId(e.active.id);
      if (!sid || !e.over) return;
      const newDay = parseDayDroppableId(e.over.id);
      if (newDay === null) return;
      const slot = slots.find((s) => s.id === sid);
      if (!slot) return;
      const track = dayTracksRef.current.get(newDay);
      if (!track) return;
      const { y: clientYRaw } = pointerDuringDragRef.current;
      const rect = track.getBoundingClientRect();
      const clientY = Math.max(rect.top, Math.min(rect.bottom, clientYRaw));
      let startMin = snapMinutosA15((clientY - rect.top) / PX_PER_MIN);
      const maxStart = MINUTOS_TOTAL_DIA - slot.duracionMin;
      startMin = Math.max(0, Math.min(maxStart, startMin));
      const newHora = minutosAHoraHHMM(startMin);
      if (newDay === slot.diaDeSemana && newHora === slot.horaInicio) return;
      try {
        const res = await fetch(`/api/grilla/slots/${sid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diaDeSemana: newDay, horaInicio: newHora }),
        });
        if (!res.ok) {
          toast.error("No se pudo mover el slot");
          return;
        }
        await onCambio();
      } catch {
        toast.error("No se pudo mover el slot");
      }
    },
    [onCambio, slots],
  );

  const onDragCancel = useCallback((): void => {
    dragPointerCleanupRef.current?.();
    dragPointerCleanupRef.current = null;
    setDragOverlay(null);
  }, []);

  const onResizeCommit = useCallback(
    async (slotId: string, nuevaDuracionMin: number): Promise<void> => {
      try {
        const res = await fetch(`/api/grilla/slots/${slotId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duracionMin: nuevaDuracionMin }),
        });
        if (!res.ok) {
          toast.error("No se pudo actualizar la duracion");
          return;
        }
        await onCambio();
      } catch {
        toast.error("No se pudo actualizar la duracion");
      }
    },
    [onCambio],
  );

  const onTrackPointerDown = useCallback((e: React.PointerEvent<HTMLElement>, dia: number): void => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-slot-block]")) return;
    const track = e.currentTarget as HTMLElement;
    const rect = track.getBoundingClientRect();
    const startMin = snapMinutosA15((e.clientY - rect.top) / PX_PER_MIN);
    draftRef.current = {
      dia,
      pointerId: e.pointerId,
      startMin,
      lastMin: startMin,
      track,
    };
    setDraftVisual({ dia, startMin, endMin: startMin });
    track.setPointerCapture(e.pointerId);
  }, []);

  const onTrackPointerMove = useCallback((e: React.PointerEvent<HTMLElement>): void => {
    const d = draftRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const rect = d.track.getBoundingClientRect();
    const m = snapMinutosA15((e.clientY - rect.top) / PX_PER_MIN);
    d.lastMin = m;
    setDraftVisual({ dia: d.dia, startMin: d.startMin, endMin: m });
  }, []);

  const abrirTarget = useCallback(
    (target: SlotFormTarget, anchorRect?: DOMRect): void => {
      if (target.kind === "nuevo-semanal" && onNuevoSlot) {
        onNuevoSlot(target);
        return;
      }
      if (target.kind === "editar-slot" && onEditarSlot) {
        onEditarSlot(target.slot);
        return;
      }
      const anchor = anchorRect ?? scrollRef.current?.getBoundingClientRect() ?? new DOMRect(0, 0, 320, 200);
      setPopover({ anchorRect: anchor, target });
    },
    [onEditarSlot, onNuevoSlot],
  );

  const onTrackPointerUp = useCallback((e: React.PointerEvent<HTMLElement>): void => {
    const d = draftRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    try {
      d.track.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    draftRef.current = null;
    setDraftVisual(null);
    const lo = Math.min(d.startMin, d.lastMin);
    const hi = Math.max(d.startMin, d.lastMin);
    const rect = d.track.getBoundingClientRect();
    const spanMin = Math.abs(d.lastMin - d.startMin);
    const clickLike = spanMin < 20;
    if (clickLike) {
      const start = snapMinutosA15(lo);
      const topPx = start * PX_PER_MIN;
      const anchor = new DOMRect(rect.left, rect.top + topPx, rect.width, 60 * PX_PER_MIN);
      abrirTarget({
        kind: "nuevo-semanal",
        defaults: { diaDeSemana: d.dia, horaInicio: minutosAHoraHHMM(start), duracionMin: 60 },
      }, anchor);
      return;
    }
    const start = snapMinutosA15(lo);
    const dur = Math.max(15, snapMinutosA15(hi - lo));
    const topPx = Math.min(start, snapMinutosA15(hi)) * PX_PER_MIN;
    const hPx = dur * PX_PER_MIN;
    const anchor = new DOMRect(rect.left, rect.top + topPx, rect.width, hPx);
    abrirTarget({
      kind: "nuevo-semanal",
      defaults: { diaDeSemana: d.dia, horaInicio: minutosAHoraHHMM(start), duracionMin: dur },
    }, anchor);
  }, [abrirTarget]);

  const abrirNuevoSlotDesdeDia = useCallback((dia: number): void => {
    abrirTarget({
      kind: "nuevo-semanal",
      defaults: { diaDeSemana: dia, horaInicio: "08:00", duracionMin: 60 },
    });
  }, [abrirTarget]);

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={onDragStart}
        onDragEnd={(ev) => void onDragEnd(ev)}
        onDragCancel={onDragCancel}
      >
        <div
          ref={scrollRef}
          className={cn(
            "max-h-[min(720px,70vh)] overflow-y-auto overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm",
            mobile && "snap-x snap-mandatory",
          )}
        >
          <div className={cn("flex shrink-0 border-b border-[color:var(--border)] bg-[color:var(--surface-soft)]", mobile ? "min-w-max" : "w-full")}>
            <div className="sticky left-0 z-20 w-11 shrink-0 border-r border-[color:var(--border)] bg-[color:var(--surface-soft)]" />
            <div className={cn("min-w-0 flex-1", mobile ? "flex" : "grid grid-cols-7")}>
              {diasAMostrar.map((dia) => (
                <div
                  key={`hdr-${dia.valor}`}
                  className={cn(
                    "flex items-center justify-between gap-1 border-l border-[color:var(--border)] px-2 py-2",
                    dia.valor === weekdayHoyArgentina &&
                      "border-b-2 border-b-[color:var(--danger)]/50 bg-[color:var(--primary)]/8",
                    mobile ? "min-w-[82vw] shrink-0 snap-start md:min-w-0" : "",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-medium text-[color:var(--muted)]",
                      dia.valor === weekdayHoyArgentina && "font-semibold text-[color:var(--text)]",
                    )}
                  >
                    {dia.etiqueta}
                  </span>
                  <button
                    type="button"
                    title={`Nuevo slot el ${dia.etiqueta}`}
                    aria-label={`Nuevo slot el ${dia.etiqueta}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-sm leading-none text-[color:var(--text)] transition hover:border-[color:var(--primary)]/50 hover:bg-[color:var(--primary)]/10"
                    onClick={() => abrirNuevoSlotDesdeDia(dia.valor)}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className={cn("flex shrink-0", mobile ? "min-w-max" : "w-full")}>
            <div
              className="sticky left-0 z-20 w-11 shrink-0 border-r border-[color:var(--border)] bg-[color:var(--surface-soft)] py-0 pr-1 text-right text-[10px] text-[color:var(--muted)] relative"
              style={{ height: heightPx }}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="absolute right-1 text-[color:var(--muted)]"
                  style={{ top: h * 60 * PX_PER_MIN, height: 60 * PX_PER_MIN }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            <div className={cn("min-w-0 flex-1", mobile ? "flex" : "grid grid-cols-7")}>
              {diasAMostrar.map((dia) => {
                const lista = slots.filter((s) => s.diaDeSemana === dia.valor);
                const layoutMap = layoutSlotsDia(lista);
                const esHoy = dia.valor === weekdayHoyArgentina;
                return (
                  <DroppableDayTrack
                    key={dia.valor}
                    dia={dia.valor}
                    esHoy={esHoy}
                    heightPx={heightPx}
                    trackRef={trackRef}
                    onTrackPointerDown={onTrackPointerDown}
                    onTrackPointerMove={onTrackPointerMove}
                    onTrackPointerUp={onTrackPointerUp}
                    mobile={mobile}
                  >
                    {lista.length === 0 ? (
                      <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center px-2">
                        <p className="text-center text-[11px] text-[color:var(--muted)]">
                          Hacé clic y arrastrá para crear un slot
                        </p>
                      </div>
                    ) : null}
                    {draftVisual && draftVisual.dia === dia.valor ? (
                      <div
                        className="pointer-events-none absolute z-[5] rounded-lg border-2 border-dashed border-[color:var(--primary)]/60 bg-[color:var(--primary)]/10"
                        style={{
                          top: Math.min(draftVisual.startMin, draftVisual.endMin) * PX_PER_MIN,
                          height: Math.max(15, Math.abs(draftVisual.endMin - draftVisual.startMin)) * PX_PER_MIN,
                          left: 2,
                          right: 2,
                        }}
                      />
                    ) : null}
                    {lista.map((slot) => {
                      const layout = layoutMap.get(slot.id) ?? { leftPct: 0, widthPct: 100 };
                      return (
                        <SlotBloque
                          key={slot.id}
                          slot={slot}
                          layout={layout}
                          onResizeCommit={onResizeCommit}
                          onClickEditar={() => {
                            if (onEditarSlot) {
                              onEditarSlot(slot);
                              return;
                            }
                            setPopover({ anchorRect: new DOMRect(0, 0, 0, 0), target: { kind: "editar-slot", slot } });
                          }}
                        />
                      );
                    })}
                    {esHoy ? <LineaHoraActual visible /> : null}
                  </DroppableDayTrack>
                );
              })}
            </div>
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {dragOverlay ? <SlotBloquePreview slot={dragOverlay.slot} layout={dragOverlay.layout} /> : null}
        </DragOverlay>
      </DndContext>

      {!onNuevoSlot && !onEditarSlot ? (
        <SlotPopover
          open={popover !== null}
          anchorRect={popover?.anchorRect ?? null}
          target={popover?.target ?? null}
          onClose={() => setPopover(null)}
          onHecho={onCambio}
        />
      ) : null}
    </div>
  );
}
