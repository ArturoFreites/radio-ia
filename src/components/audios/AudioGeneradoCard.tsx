"use client";

import { Download, Pause, Play } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AudioGeneradoItem, TipoAudioGenerado } from "@/lib/audios/catalogoGenerados";
import { etiquetaTipoAudio } from "@/lib/audios/nombreDescarga";

export type AudioGeneradoCardProps = {
  item: AudioGeneradoItem;
  reproduciendo: boolean;
  onTogglePlay: () => void;
  onDescargar: () => void;
};

const BADGE_POR_TIPO: Record<TipoAudioGenerado, "dj" | "ready" | "generating" | "pending" | "idle"> = {
  PRESENTACION: "dj",
  INTRO_APERTURA: "ready",
  TRANSICION_SLOT: "generating",
  PUBLICIDAD: "pending",
  DEMO_PUBLICIDAD: "idle",
};

function formatearFecha(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}

function formatearDuracion(sec: number | null): string | null {
  if (sec == null || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AudioGeneradoCard({
  item,
  reproduciendo,
  onTogglePlay,
  onDescargar,
}: AudioGeneradoCardProps): React.ReactElement {
  const duracion = formatearDuracion(item.duracionSec);

  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={BADGE_POR_TIPO[item.tipo]}
            label={etiquetaTipoAudio(item.tipo)}
            showDot={false}
          />
          <span className="text-xs text-[color:var(--muted)]">{formatearFecha(item.creadoEn)}</span>
          {duracion ? (
            <span className="text-xs text-[color:var(--muted)]">· {duracion}</span>
          ) : null}
        </div>
        <h3 className="truncate text-base font-semibold text-[color:var(--text)]">{item.titulo}</h3>
        {item.contexto ? (
          <p className="line-clamp-2 text-sm text-[color:var(--muted)]">{item.contexto}</p>
        ) : null}
        {!item.tieneAudio ? (
          <p className="text-xs text-[color:var(--warning)]">Audio no disponible en disco</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!item.tieneAudio}
          onClick={onTogglePlay}
          iconLeft={
            reproduciendo ? (
              <Pause className="h-4 w-4" aria-hidden />
            ) : (
              <Play className="h-4 w-4" aria-hidden />
            )
          }
        >
          {reproduciendo ? "Pausar" : "Reproducir"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!item.tieneAudio}
          onClick={onDescargar}
          iconLeft={<Download className="h-4 w-4" aria-hidden />}
        >
          Descargar
        </Button>
      </div>
    </Card>
  );
}
