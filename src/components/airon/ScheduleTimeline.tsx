import { Pencil, Trash2 } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type ScheduleTimelineItem = {
  id: string;
  hora: string;
  horaFin?: string;
  titulo: string;
  playlist?: string;
  voz?: string;
  duracionMin?: number;
  origenLabel?: string;
  estado: BadgeVariant;
  estadoLabel: string;
  interrupciones?: number;
  isLive?: boolean;
  isPast?: boolean;
  isNext?: boolean;
  accentClass?: string;
};

export type ScheduleTimelineProps = {
  items: ScheduleTimelineItem[];
  className?: string;
  onEdit?: (item: ScheduleTimelineItem) => void;
  onDelete?: (item: ScheduleTimelineItem) => void;
};

function duracionEtiqueta(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

export function ScheduleTimeline({
  items,
  className,
  onEdit,
  onDelete,
}: ScheduleTimelineProps): React.ReactElement {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-12 text-center">
        <p className="text-sm font-medium text-[color:var(--text)]">No hay slots programados para hoy</p>
        <p className="mt-1 text-xs text-[color:var(--muted)]">Creá un slot semanal o un evento puntual para empezar.</p>
      </div>
    );
  }

  const interactivo = Boolean(onEdit || onDelete);

  return (
    <ol className={cn("relative space-y-0", className)}>
      <span
        aria-hidden
        className="absolute bottom-2 left-[1.125rem] top-2 w-px bg-gradient-to-b from-[color:var(--border)] via-[color:var(--border)] to-transparent"
      />
      {items.map((item) => (
        <li key={item.id} className="relative pl-10">
          <span
            aria-hidden
            className={cn(
              "absolute left-3 top-6 z-10 h-3 w-3 rounded-full border-2 border-[color:var(--background)] ring-2 ring-[color:var(--background)]",
              item.isLive
                ? "bg-[color:var(--danger)] shadow-[0_0_12px_var(--live-glow)]"
                : item.isNext
                  ? "bg-[color:var(--warning)]"
                  : item.isPast
                    ? "bg-[color:var(--muted)]/40"
                    : "bg-[color:var(--primary)]",
            )}
          />
          <article
            className={cn(
              "group/timeline relative mb-3 overflow-hidden rounded-2xl border transition-all",
              item.isLive
                ? "border-[color:var(--danger)]/40 bg-[color:var(--danger)]/5 shadow-[0_0_24px_-8px_var(--live-glow)]"
                : item.isNext
                  ? "border-[color:var(--warning)]/50 bg-[color:var(--surface)]"
                  : "border-[color:var(--border)] bg-[color:var(--surface)]",
              item.isPast ? "opacity-50" : undefined,
              interactivo && "cursor-pointer hover:border-[color:var(--primary)]/30 hover:bg-[color:var(--surface-soft)]",
            )}
            onClick={onEdit ? () => onEdit(item) : undefined}
            onKeyDown={
              onEdit
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onEdit(item);
                    }
                  }
                : undefined
            }
            role={interactivo ? "button" : undefined}
            tabIndex={interactivo ? 0 : undefined}
          >
            {item.accentClass ? (
              <span
                aria-hidden
                className={cn("absolute inset-y-0 left-0 w-1", item.accentClass)}
              />
            ) : null}
            <div className="p-4 pl-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold tabular-nums text-[color:var(--text)]">
                    {item.hora}
                    {item.horaFin ? (
                      <span className="font-normal text-[color:var(--muted)]"> – {item.horaFin}</span>
                    ) : null}
                  </p>
                  {item.duracionMin !== undefined ? (
                    <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                      {duracionEtiqueta(item.duracionMin)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {item.origenLabel ? (
                    <span className="rounded-full bg-[color:var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                      {item.origenLabel}
                    </span>
                  ) : null}
                  {item.isLive ? <Badge label="En vivo" pulse variant="live" /> : null}
                  <Badge label={item.estadoLabel} variant={item.estado} />
                </div>
              </div>
              <h3 className="mt-2 truncate text-base font-semibold text-[color:var(--text)]">{item.titulo}</h3>
              {item.voz ? (
                <p className="mt-1 text-sm text-[color:var(--muted)]">Voz: {item.voz}</p>
              ) : null}
              {item.interrupciones !== undefined && item.interrupciones > 0 ? (
                <p className="mt-2 text-xs text-[color:var(--muted)]">
                  {item.interrupciones} interrupción{item.interrupciones !== 1 ? "es" : ""} activa{item.interrupciones !== 1 ? "s" : ""}
                </p>
              ) : null}
              {interactivo ? (
                <div
                  className="mt-3 flex gap-2 opacity-0 transition-opacity group-hover/timeline:opacity-100 group-focus-within/timeline:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {onEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      iconLeft={<Pencil className="h-3.5 w-3.5" aria-hidden />}
                      onClick={() => onEdit(item)}
                    >
                      Editar
                    </Button>
                  ) : null}
                  {onDelete ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      iconLeft={<Trash2 className="h-3.5 w-3.5" aria-hidden />}
                      onClick={() => onDelete(item)}
                    >
                      Eliminar
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}
