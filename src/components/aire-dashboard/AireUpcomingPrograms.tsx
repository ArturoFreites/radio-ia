"use client";

import { horaFinDesdeInicioYDuracion } from "@/lib/grilla/tiempo";
import { cn } from "@/lib/utils";

export type AireUpcomingProgram = {
  id: string;
  titulo: string;
  dj: string;
  horaInicio: string;
  duracionMin: number;
  gradient: string;
};

export type AireUpcomingProgramsProps = {
  programs: AireUpcomingProgram[];
  className?: string;
};

export function AireUpcomingPrograms({
  programs,
  className,
}: AireUpcomingProgramsProps): React.ReactElement {
  return (
    <section className={cn("dashboard-card border-white/[0.08] p-5 md:p-6", className)}>
      <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--primary)]">
        Próximos programas
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {programs.length === 0 ? (
          <p className="col-span-full text-sm text-[color:var(--muted)]">
            No hay más slots programados para hoy.
          </p>
        ) : null}
        {programs.map((program) => {
          const horaFin = horaFinDesdeInicioYDuracion(program.horaInicio, program.duracionMin);
          return (
            <article
              key={program.id}
              className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[color:var(--surface-soft)] transition hover:border-[color:var(--primary)]/20 hover:shadow-[0_0_24px_var(--primary-glow)]"
            >
              <div
                className="aspect-[4/3] w-full"
                style={{ background: program.gradient }}
                aria-hidden
              />
              <div className="p-3.5">
                <h3 className="truncate text-sm font-semibold text-white">{program.titulo}</h3>
                <p className="mt-0.5 truncate text-xs text-[color:var(--muted)]">{program.dj}</p>
                <p className="mt-2 font-mono text-[11px] tabular-nums text-[color:var(--primary)]">
                  {program.horaInicio} - {horaFin}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
