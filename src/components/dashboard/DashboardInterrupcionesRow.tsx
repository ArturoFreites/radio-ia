"use client";

import Link from "next/link";
import { Clock, Cloud, Megaphone, Plus } from "lucide-react";
import type { DjInterrupcionesConfig } from "@/lib/grilla/djConfigSchema";
import { cn } from "@/lib/utils";

type InterrupcionCardData = {
  id: string;
  icon: React.ReactNode;
  titulo: string;
  detalle: string;
  countdown?: string;
  tag: string;
  tagVariant: "auto" | "programada";
};

function buildCards(
  djConfig: DjInterrupcionesConfig | null,
  radioCiudad: string | undefined,
  publicidades: Array<{ id: string; nombre: string }>,
): InterrupcionCardData[] {
  const cards: InterrupcionCardData[] = [];

  if (djConfig?.djHoraActiva && djConfig.djHoraIntervaloMin !== null) {
    cards.push({
      id: "hora",
      icon: <Clock className="h-5 w-5" aria-hidden />,
      titulo: "Hora exacta",
      detalle: "10:00:00",
      countdown: djConfig.djHoraIntervaloMin ? `Cada ${djConfig.djHoraIntervaloMin} min` : undefined,
      tag: "Automática",
      tagVariant: "auto",
    });
  }

  if (djConfig?.djClimaActivo) {
    cards.push({
      id: "clima",
      icon: <Cloud className="h-5 w-5" aria-hidden />,
      titulo: "Clima",
      detalle: radioCiudad ?? "Ciudad configurada",
      countdown: "22°",
      tag: "Automática",
      tagVariant: "auto",
    });
  }

  const enRotacion = publicidades.slice(0, 2);
  if (djConfig?.djPublicidadActiva && enRotacion.length > 0) {
    enRotacion.forEach((item, index) => {
      cards.push({
        id: `pub-${item.id}`,
        icon: <Megaphone className="h-5 w-5" aria-hidden />,
        titulo: "Publicidad",
        detalle: item.nombre,
        tag: "Programada",
        tagVariant: "programada",
        countdown: index === 0 ? "Próxima rotación" : undefined,
      });
    });
  } else if (djConfig?.djPublicidadActiva) {
    cards.push({
      id: "publicidad",
      icon: <Megaphone className="h-5 w-5" aria-hidden />,
      titulo: "Publicidad",
      detalle: "Rotación automática",
      tag: "Programada",
      tagVariant: "programada",
    });
  }

  return cards;
}

export type DashboardInterrupcionesRowProps = {
  djConfig: DjInterrupcionesConfig | null;
  radioCiudad?: string;
  publicidades: Array<{ id: string; nombre: string }>;
  className?: string;
};

export function DashboardInterrupcionesRow({
  djConfig,
  radioCiudad,
  publicidades,
  className,
}: DashboardInterrupcionesRowProps): React.ReactElement {
  const cards = buildCards(djConfig, radioCiudad, publicidades);

  return (
    <section className={cn("space-y-4", className)}>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">Interrupciones programadas</h2>
        <p className="mt-0.5 text-sm text-[color:var(--muted)]">Automáticas y publicidad en cola</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1">
        {cards.map((card) => (
          <article
            key={card.id}
            className="dashboard-card flex min-w-[200px] shrink-0 flex-col gap-3 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-[color:var(--muted)]">{card.icon}</div>
              <InterrupcionTag variant={card.tagVariant}>{card.tag}</InterrupcionTag>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{card.titulo}</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">{card.detalle}</p>
              {card.countdown ? (
                <p className="mt-2 font-mono text-xs tabular-nums text-[color:var(--primary)]">
                  {card.countdown}
                </p>
              ) : null}
            </div>
          </article>
        ))}

        <Link
          className="dashboard-card flex min-w-[180px] shrink-0 flex-col items-center justify-center gap-2 border-dashed bg-transparent p-4 text-[color:var(--muted)] transition hover:border-[color:var(--primary)]/30 hover:text-[color:var(--primary)]"
          href="/grilla"
        >
          <Plus className="h-5 w-5" aria-hidden />
          <span className="text-xs font-medium">Agregar interrupción</span>
        </Link>
      </div>
    </section>
  );
}

function InterrupcionTag({
  variant,
  children,
}: {
  variant: "auto" | "programada";
  children: string;
}): React.ReactElement {
  const isAuto = variant === "auto";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium",
        isAuto
          ? "border border-[color:var(--purple)]/25 bg-[color:var(--purple)]/12 text-[color:var(--purple)]"
          : "border border-[color:var(--primary)]/25 bg-[color:var(--primary)]/12 text-[color:var(--primary)]",
      )}
    >
      {children}
    </span>
  );
}
