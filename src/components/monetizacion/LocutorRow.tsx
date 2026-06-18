"use client";

import { GeneroVoz, TonoVoz } from "@prisma/client";
import { MoreVertical, Pause, Play } from "lucide-react";
import { Waveform } from "@/components/airon/Waveform";
import { cn } from "@/lib/utils";

export type LocutorRowData = {
  id: string;
  geminiVoiceId: string;
  alias: string;
  nombreAlAire: string | null;
  personalidad: string | null;
  genero: GeneroVoz;
  tono: TonoVoz;
  idioma: string;
  previewUrl: string | null;
};

export type LocutorRowProps = {
  locutor: LocutorRowData;
  selected?: boolean;
  playing?: boolean;
  onSelect?: () => void;
  onPlay?: () => void;
  onMenu?: () => void;
  className?: string;
};

function labelGenero(genero: GeneroVoz): string {
  switch (genero) {
    case GeneroVoz.MASCULINA:
      return "Masculino";
    case GeneroVoz.FEMENINA:
      return "Femenino";
    default:
      return "Neutro";
  }
}

function labelIdioma(idioma: string): string {
  if (idioma === "es-AR") return "Español (AR)";
  if (idioma.startsWith("es")) return "Español";
  return idioma;
}

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function LocutorRow({
  locutor,
  selected = false,
  playing = false,
  onSelect,
  onPlay,
  onMenu,
  className,
}: LocutorRowProps): React.ReactElement {
  const displayName = locutor.nombreAlAire ?? locutor.alias;
  const descripcion =
    locutor.personalidad?.trim() ||
    `Estilo ${locutor.tono.toLowerCase().replace("_", " ")}`;

  return (
    <article
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 transition",
        selected
          ? "border-[color:var(--primary)] bg-[color:var(--primary)]/5 ring-1 ring-[color:var(--primary)]/30"
          : "border-[color:var(--border)] bg-[color:var(--surface-soft)] hover:border-[color:var(--border)]/80",
        onSelect ? "cursor-pointer" : undefined,
        className,
      )}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[color:var(--purple)]/40 to-[color:var(--surface-2)] text-sm font-bold text-[color:var(--text)]">
        {iniciales(displayName)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="truncate text-sm font-semibold text-[color:var(--text)]">{displayName}</h3>
          <span className="rounded-md bg-[color:var(--purple)]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--purple)]">
            IA
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-[color:var(--muted)]">{descripcion}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {[labelGenero(locutor.genero), "Adulto", labelIdioma(locutor.idioma)].map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-[color:var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[color:var(--muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {playing ? <Waveform active size="sm" bars={5} className="mr-1" /> : null}
        {onPlay ? (
          <button
            type="button"
            aria-label={playing ? "Pausar preview" : "Escuchar preview"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--text)] transition hover:bg-[color:var(--surface-soft)]"
            onClick={(event) => {
              event.stopPropagation();
              onPlay();
            }}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        ) : null}
        {onMenu ? (
          <button
            type="button"
            aria-label="Opciones"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--muted)] transition hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text)]"
            onClick={(event) => {
              event.stopPropagation();
              onMenu();
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </article>
  );
}
