"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { CalendarioSemanal } from "@/components/grilla/CalendarioSemanal";
import {
  GrillaSemanalHeader,
  type GrillaVistaModo,
} from "@/components/grilla/GrillaSemanalHeader";
import { GrillaTablaSemanal } from "@/components/grilla/GrillaTablaSemanal";
import { SlotWizardDialog } from "@/components/grilla/SlotWizardDialog";
import type { SlotFormTarget } from "@/components/grilla/SlotForm";
import { ScheduleTimeline, type ScheduleTimelineItem } from "@/components/airon/ScheduleTimeline";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { GrillaEditorEventoRow, GrillaEditorSlotRow, SlotHoy } from "@/types/grilla";
import { minutosAHoraHHMM } from "@/lib/grilla/calendarioSlots";
import { SLOT_COLOR_CLASSES, variantColorSlot } from "@/lib/grilla/slotColores";
import { targetEdicionDesdeSlotHoy, urlEliminarSlotHoy } from "@/lib/grilla/slotHoyEditor";
import { fechaCalendarArgentinaIgual, getPartesArgentina, horaStringAMinutos } from "@/lib/grilla/tiempo";
import {
  diasSemanaDesde,
  inicioSemanaArgentina,
  rangoSemanaEtiqueta,
} from "@/lib/grilla/semanaArgentina";
import { cn } from "@/lib/utils";

function partesFechaEvento(iso: string): { dia: string; mes: string; weekday: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { dia: "--", mes: "---", weekday: "---" };
  const dia = String(d.getUTCDate()).padStart(2, "0");
  const mes = d.toLocaleDateString("es-AR", { month: "short", timeZone: "UTC" }).replace(".", "");
  const weekday = d.toLocaleDateString("es-AR", { weekday: "short", timeZone: "UTC" }).replace(".", "");
  return { dia, mes, weekday };
}

function useEnterTransition(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setReady(true);
        });
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}

function contarInterrupcionesSlotHoy(s: SlotHoy): number {
  let n = 0;
  if (s.djHoraActiva) n += 1;
  if (s.djClimaActivo) n += 1;
  if (s.djPublicidadActiva) n += 1;
  if (s.djAudioActiva) n += 1;
  if (s.djTextoActiva) n += 1;
  if (s.presentacionCadaTemas > 0 && s.voz1Nombre) n += 1;
  return n;
}

function slotHoyEnCurso(slotsHoy: SlotHoy[], partesHoy: ReturnType<typeof getPartesArgentina>): SlotHoy | null {
  const ahoraMin = partesHoy.hour * 60 + partesHoy.minute;
  for (const s of slotsHoy) {
    const start = horaStringAMinutos(s.horaInicio);
    const end = start + s.duracionMin;
    if (ahoraMin >= start && ahoraMin < end) return s;
  }
  return null;
}

type EventoCardProps = {
  evento: GrillaEditorEventoRow;
  isLeaving: boolean;
  isHoy: boolean;
  isPasado: boolean;
  onEliminar: (id: string) => void;
  onEditar: (evento: GrillaEditorEventoRow) => void;
};

function EventoCard({ evento, isLeaving, isHoy, isPasado, onEliminar, onEditar }: EventoCardProps): React.ReactElement {
  const entered = useEnterTransition();
  const { dia, mes, weekday } = partesFechaEvento(evento.fecha);
  const nombre = evento.playlistNombre ?? "DJ — sin playlist";
  const djSinPlaylist = !evento.playlistNombre;
  const lineaVocesDj = evento.voz1 ? evento.voz1.nombre : "sin diálogo IA";

  return (
    <Card
      interactive
      className={cn(
        "group relative cursor-pointer border-[color:var(--warning)]/25 bg-[color:var(--warning)]/5 p-3 text-sm ease-out will-change-[opacity,transform]",
        isHoy && "ring-1 ring-[color:var(--danger)]/40",
        isPasado && "opacity-50",
        !isLeaving && !entered && "scale-95 opacity-0 duration-0",
        !isLeaving && entered && "scale-100 opacity-100 duration-150",
        isLeaving && "scale-95 opacity-0 duration-[120ms] ease-in",
      )}
      onClick={() => onEditar(evento)}
    >
      {isHoy ? (
        <span className="absolute right-3 top-3 rounded-full bg-[color:var(--danger)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--danger)]">
          Hoy
        </span>
      ) : null}

      <div className="grid grid-cols-[auto_auto_1fr] items-start gap-3">
        <div className="min-w-[48px] text-center">
          <p className="font-mono text-2xl font-bold leading-none">{dia}</p>
          <p className="mt-1 text-[11px] uppercase text-[color:var(--muted)]">{mes}</p>
          <p className="text-xs capitalize text-[color:var(--muted)]">{weekday}</p>
        </div>
        <div className="pt-1 text-[color:var(--border)]">|</div>
        <div className="min-w-0 space-y-1.5 pt-0.5">
          <p className="font-mono font-semibold">{evento.horaInicio}</p>
          <p className="text-xs text-[color:var(--muted)]">{evento.duracionMin} min</p>
          <p className={cn("truncate text-sm", djSinPlaylist && "opacity-50")}>{nombre}</p>
          <p className={cn("truncate text-xs", lineaVocesDj === "sin diálogo IA" ? "opacity-40" : "opacity-70")}>
            {lineaVocesDj}
          </p>
          <span className="inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            DJ
          </span>
          <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={(e) => { e.stopPropagation(); onEditar(evento); }}>
              Editar
            </Button>
            <Button type="button" variant="danger" size="sm" className="h-7 px-2 text-[11px]" onClick={(e) => { e.stopPropagation(); onEliminar(evento.id); }}>
              Eliminar
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function GrillaEditor(): React.ReactElement {
  const [slots, setSlots] = useState<GrillaEditorSlotRow[]>([]);
  const [eventos, setEventos] = useState<GrillaEditorEventoRow[]>([]);
  const [slotsHoy, setSlotsHoy] = useState<SlotHoy[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<GrillaVistaModo>("semana");
  const [offsetSemanas, setOffsetSemanas] = useState(0);
  const [wizardTarget, setWizardTarget] = useState<SlotFormTarget | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const recargar = useCallback(async (): Promise<void> => {
    setError(null);
    const [rSlots, rEventos, rHoy] = await Promise.all([
      fetch("/api/grilla/slots"),
      fetch("/api/grilla/eventos"),
      fetch("/api/grilla/hoy"),
    ]);
    if (!rSlots.ok || !rEventos.ok) {
      setError("No se pudo cargar la grilla");
      setCargando(false);
      return;
    }
    const [jSlots, jEventos] = await Promise.all([
      rSlots.json() as Promise<GrillaEditorSlotRow[]>,
      rEventos.json() as Promise<GrillaEditorEventoRow[]>,
    ]);
    setSlots(jSlots);
    setEventos(jEventos);
    if (rHoy.ok) {
      const jHoy = (await rHoy.json()) as { slots: SlotHoy[] };
      setSlotsHoy(jHoy.slots ?? []);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void recargar();
    });
  }, [recargar]);

  const partesHoy = getPartesArgentina(new Date());
  const inicioSemana = useMemo(() => {
    const base = inicioSemanaArgentina(new Date());
    base.setUTCDate(base.getUTCDate() + offsetSemanas * 7);
    return base;
  }, [offsetSemanas]);

  const diasSemana = useMemo(
    () => diasSemanaDesde(inicioSemana, partesHoy.weekday0Sun),
    [inicioSemana, partesHoy.weekday0Sun],
  );

  const slotEnVivoId = useMemo((): string | null => {
    const enCurso = slotHoyEnCurso(slotsHoy, partesHoy);
    if (!enCurso || enCurso.origen !== "slot") return null;
    return enCurso.id.startsWith("slot_") ? enCurso.id.slice(5) : enCurso.id;
  }, [slotsHoy, partesHoy]);

  const timelineHoy = useMemo((): ScheduleTimelineItem[] => {
    const ahoraMin = partesHoy.hour * 60 + partesHoy.minute;
    const enCurso = slotHoyEnCurso(slotsHoy, partesHoy);
    let nextMarked = false;
    return slotsHoy.map((s) => {
      const start = horaStringAMinutos(s.horaInicio);
      const end = start + s.duracionMin;
      const isLive = enCurso?.id === s.id;
      const isPast = end <= ahoraMin;
      const isNext = !isLive && !isPast && !nextMarked;
      if (isNext) nextMarked = true;
      const rowRef =
        s.origen === "slot"
          ? slots.find((row) => row.id === (s.id.startsWith("slot_") ? s.id.slice(5) : s.id))
          : eventos.find((row) => row.id === (s.id.startsWith("evt_") ? s.id.slice(4) : s.id));
      const variant = rowRef ? variantColorSlot(rowRef) : "dj";
      return {
        id: s.id,
        hora: s.horaInicio,
        horaFin: minutosAHoraHHMM(end >= 24 * 60 ? 24 * 60 - 1 : end),
        titulo: s.playlistNombre ?? "Slot DJ",
        voz: s.voz1Nombre,
        duracionMin: s.duracionMin,
        origenLabel: s.origen === "evento" ? "Evento" : "Semanal",
        estado: isLive ? "live" : isPast ? "idle" : "ready",
        estadoLabel: isLive ? "En vivo" : isPast ? "Finalizado" : "Programado",
        interrupciones: contarInterrupcionesSlotHoy(s),
        isLive,
        isPast,
        isNext,
        accentClass: SLOT_COLOR_CLASSES[variant].dot,
      };
    });
  }, [slotsHoy, partesHoy, slots, eventos]);

  const [leavingEventoIds, setLeavingEventoIds] = useState<Set<string>>(() => new Set());
  const eventoDeleteBusyRef = useRef<Set<string>>(new Set());

  function abrirWizard(target: SlotFormTarget): void {
    setWizardTarget(target);
    setWizardOpen(true);
  }

  function abrirCrearSlot(diaDeSemana?: number): void {
    abrirWizard({
      kind: "nuevo-semanal",
      defaults: {
        diaDeSemana: diaDeSemana ?? partesHoy.weekday0Sun,
        horaInicio: "08:00",
        duracionMin: 60,
      },
    });
  }

  function editarDesdeSlotHoy(slotId: string): void {
    const slot = slotsHoy.find((s) => s.id === slotId);
    if (!slot) return;
    const target = targetEdicionDesdeSlotHoy(slot, slots, eventos);
    if (target) abrirWizard(target);
  }

  async function eliminarSlotHoy(slotId: string): Promise<void> {
    const slot = slotsHoy.find((s) => s.id === slotId);
    if (!slot) return;
    const etiqueta = slot.origen === "slot" ? "este slot" : "este evento";
    if (!window.confirm(`¿Eliminar ${etiqueta}? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(urlEliminarSlotHoy(slot), { method: "DELETE" });
    if (!res.ok) {
      setError("No se pudo eliminar");
      return;
    }
    await recargar();
  }

  async function eliminarEvento(id: string): Promise<void> {
    if (eventoDeleteBusyRef.current.has(id)) return;
    eventoDeleteBusyRef.current.add(id);
    setLeavingEventoIds((prev) => new Set(prev).add(id));
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 120);
    });
    try {
      const res = await fetch(`/api/grilla/eventos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("No se pudo eliminar el evento");
        return;
      }
      await recargar();
    } finally {
      eventoDeleteBusyRef.current.delete(id);
      setLeavingEventoIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  if (cargando) {
    return <p className="text-[color:var(--muted)]">Cargando grilla…</p>;
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-[color:var(--danger)]">{error}</p> : null}

      <GrillaSemanalHeader
        rangoSemana={rangoSemanaEtiqueta(inicioSemana)}
        vista={vista}
        onVistaChange={setVista}
        onSemanaAnterior={() => setOffsetSemanas((n) => n - 1)}
        onSemanaSiguiente={() => setOffsetSemanas((n) => n + 1)}
        onCrearSlot={() => abrirCrearSlot()}
      />

      {vista === "semana" ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--text)]">Vista semanal</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Plantilla de slots por día. Hacé clic en un bloque para editarlo o en una columna vacía para crear.
            </p>
          </div>
          <GrillaTablaSemanal
            slots={slots}
            dias={diasSemana}
            slotEnVivoId={slotEnVivoId}
            onEditarSlot={(slot) => abrirWizard({ kind: "editar-slot", slot })}
            onCrearEnDia={(dia) => abrirCrearSlot(dia)}
          />
        </section>
      ) : null}

      {vista === "hoy" ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--text)]">Programación de hoy</h2>
              <p className="text-sm text-[color:var(--muted)]">
                {slotsHoy.length} slot{slotsHoy.length !== 1 ? "s" : ""} · ordenados por horario
              </p>
            </div>
          </div>
          <Card className="p-4 sm:p-5">
            <ScheduleTimeline
              items={timelineHoy}
              onEdit={(item) => editarDesdeSlotHoy(item.id)}
              onDelete={(item) => void eliminarSlotHoy(item.id)}
            />
          </Card>
        </section>
      ) : null}

      {vista === "dia" ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--text)]">Calendario por día</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Arrastrá bloques para moverlos o hacé clic y arrastrá en la cuadrícula para crear slots.
            </p>
          </div>
          <CalendarioSemanal
            slots={slots}
            onCambio={recargar}
            onNuevoSlot={(target) => abrirWizard(target)}
            onEditarSlot={(slot) => abrirWizard({ kind: "editar-slot", slot })}
          />
        </section>
      ) : null}

      <section>
        <SectionHeader
          title="Eventos puntuales"
          action={(
            <Button
              type="button"
              variant="secondary"
              size="sm"
              iconLeft={<Plus className="h-3.5 w-3.5" aria-hidden />}
              onClick={() => abrirWizard({ kind: "nuevo-evento", defaults: undefined })}
            >
              Nuevo evento puntual
            </Button>
          )}
          className="mb-2"
        />
        <p className="mb-2 text-xs text-[color:var(--muted)]">
          Tienen prioridad sobre el slot semanal si se solapan en horario.
        </p>
        {eventos.length === 0 ? (
          <Card className="flex items-center gap-3 border-dashed text-[color:var(--muted)]">
            <CalendarDays className="h-5 w-5 opacity-50" aria-hidden />
            <p className="text-sm">No hay eventos puntuales</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {eventos.map((ev) => {
              const isHoy = fechaCalendarArgentinaIgual(new Date(ev.fecha), partesHoy);
              const f = new Date(ev.fecha);
              const y = f.getUTCFullYear();
              const m = f.getUTCMonth() + 1;
              const d = f.getUTCDate();
              const hoyYmd = partesHoy.year * 10_000 + partesHoy.month * 100 + partesHoy.day;
              const evYmd = y * 10_000 + m * 100 + d;
              const evHoraMin = Number(ev.horaInicio.slice(0, 2)) * 60 + Number(ev.horaInicio.slice(3, 5));
              const ahoraMin = partesHoy.hour * 60 + partesHoy.minute;
              const isPasado = evYmd < hoyYmd || (evYmd === hoyYmd && evHoraMin < ahoraMin);
              return (
                <EventoCard
                  key={ev.id}
                  evento={ev}
                  isHoy={isHoy}
                  isPasado={isPasado}
                  isLeaving={leavingEventoIds.has(ev.id)}
                  onEliminar={(eventoId) => void eliminarEvento(eventoId)}
                  onEditar={(evento) => abrirWizard({ kind: "editar-evento", evento })}
                />
              );
            })}
          </div>
        )}
      </section>

      <SlotWizardDialog
        open={wizardOpen}
        target={wizardTarget}
        onClose={() => {
          setWizardOpen(false);
          setWizardTarget(null);
        }}
        onHecho={recargar}
      />
    </div>
  );
}
