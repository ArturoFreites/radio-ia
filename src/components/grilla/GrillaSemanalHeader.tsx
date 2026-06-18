"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type GrillaVistaModo = "hoy" | "semana" | "dia";

export type GrillaSemanalHeaderProps = {
  rangoSemana: string;
  vista: GrillaVistaModo;
  onVistaChange: (vista: GrillaVistaModo) => void;
  onSemanaAnterior: () => void;
  onSemanaSiguiente: () => void;
  onCrearSlot: () => void;
  className?: string;
};

const VISTAS: Array<{ id: GrillaVistaModo; label: string }> = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "dia", label: "Día" },
];

export function GrillaSemanalHeader({
  rangoSemana,
  vista,
  onVistaChange,
  onSemanaAnterior,
  onSemanaSiguiente,
  onCrearSlot,
  className,
}: GrillaSemanalHeaderProps): React.ReactElement {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">Grilla semanal</h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-[color:var(--muted)]">
          <button
            type="button"
            aria-label="Semana anterior"
            className="rounded-lg p-1.5 transition hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text)]"
            onClick={onSemanaAnterior}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-medium capitalize text-[color:var(--text)]">{rangoSemana}</span>
          <button
            type="button"
            aria-label="Semana siguiente"
            className="rounded-lg p-1.5 transition hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text)]"
            onClick={onSemanaSiguiente}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div
          className="inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] p-1"
          role="tablist"
          aria-label="Vista de grilla"
        >
          {VISTAS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={vista === item.id}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                vista === item.id
                  ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
                  : "text-[color:var(--muted)] hover:text-[color:var(--text)]",
              )}
              onClick={() => onVistaChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button
          iconLeft={<Plus className="h-4 w-4" />}
          onClick={onCrearSlot}
          size="md"
        >
          Crear slot
        </Button>
      </div>
    </div>
  );
}
