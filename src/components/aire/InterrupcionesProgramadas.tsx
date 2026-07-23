"use client";

import { Clock, Cloud, Megaphone, Music2, Plus } from "lucide-react";
import type { DjInterrupcionesConfig } from "@/lib/grilla/djConfigSchema";
import { cn } from "@/lib/utils";

type InterrupcionCard = {
  id: string;
  icon: React.ReactNode;
  titulo: string;
  detalle: string;
  tag: string;
  tagVariant: "auto" | "programada";
};

function cardsDesdeConfig(config: DjInterrupcionesConfig | null, radioCiudad?: string): InterrupcionCard[] {
  if (!config) return [];
  const cards: InterrupcionCard[] = [];

  if (config.djHoraActiva && config.djHoraIntervaloMin !== null) {
    cards.push({
      id: "hora",
      icon: <Clock className="h-5 w-5" aria-hidden />,
      titulo: "Hora exacta",
      detalle: `Cada ${config.djHoraIntervaloMin} min`,
      tag: "Automática",
      tagVariant: "auto",
    });
  }

  if (config.djClimaActivo && config.djClimaIntervaloMin !== null) {
    cards.push({
      id: "clima",
      icon: <Cloud className="h-5 w-5" aria-hidden />,
      titulo: "Clima",
      detalle: radioCiudad ?? "Ciudad configurada",
      tag: "Automática",
      tagVariant: "auto",
    });
  }

  if (config.djPublicidadActiva && config.djPublicidadIntervaloMin !== null) {
    cards.push({
      id: "publicidad",
      icon: <Megaphone className="h-5 w-5" aria-hidden />,
      titulo: "Publicidad",
      detalle: `Cada ${config.djPublicidadIntervaloMin} min`,
      tag: "Programada",
      tagVariant: "programada",
    });
  }

  if (config.djAudioActiva && config.djAudioIntervaloMin !== null) {
    cards.push({
      id: "audio",
      icon: <Music2 className="h-5 w-5" aria-hidden />,
      titulo: "Audios",
      detalle: `Cada ${config.djAudioIntervaloMin} min`,
      tag: "Programada",
      tagVariant: "programada",
    });
  }

  return cards;
}

export type InterrupcionesProgramadasProps = {
  djConfig: DjInterrupcionesConfig | null;
  radioCiudad?: string;
  onDemoPublicidad?: () => void;
  className?: string;
};

export function InterrupcionesProgramadas({
  djConfig,
  radioCiudad,
  onDemoPublicidad,
  className,
}: InterrupcionesProgramadasProps): React.ReactElement {
  const cards = cardsDesdeConfig(djConfig, radioCiudad);

  return (
    <section className={cn("shrink-0", className)}>
      <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
        Interrupciones programadas
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {cards.map((card) => (
          <article
            key={card.id}
            className="flex min-w-[180px] shrink-0 flex-col gap-2 rounded-[var(--r-lg)] border border-[#1e1e1e] bg-[#0d0d0d] p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-[color:var(--muted)]">{card.icon}</div>
              <Tag variant={card.tagVariant}>{card.tag}</Tag>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{card.titulo}</p>
              <p className="mt-0.5 text-xs text-[color:var(--muted)]">{card.detalle}</p>
            </div>
          </article>
        ))}

        <button
          type="button"
          onClick={onDemoPublicidad}
          className="flex min-w-[160px] shrink-0 flex-col items-center justify-center gap-2 rounded-[var(--r-lg)] border border-dashed border-[#2a2a2a] bg-transparent p-4 text-[color:var(--muted)] transition-colors hover:border-[color:var(--primary)]/40 hover:text-[color:var(--primary)]"
        >
          <Plus className="h-5 w-5" aria-hidden />
          <span className="text-xs">Agregar interrupción</span>
        </button>
      </div>
    </section>
  );
}

function Tag({ variant, children }: { variant: "auto" | "programada"; children: string }): React.ReactElement {
  const isAuto = variant === "auto";
  return (
    <span
      className={cn(
        "shrink-0 text-[10px] font-medium",
        isAuto ? "text-[color:var(--purple)]" : "text-[color:var(--primary)]",
      )}
      style={{
        borderRadius: "var(--r-full)",
        padding: "2px 8px",
        background: isAuto ? "rgba(139,92,246,.15)" : "rgba(194,252,74,.12)",
        border: isAuto ? "1px solid rgba(139,92,246,.25)" : "1px solid rgba(194,252,74,.25)",
      }}
    >
      {children}
    </span>
  );
}
