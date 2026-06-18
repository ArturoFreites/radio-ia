"use client";

import { MoreVertical, Play, Plus } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils";

export type AireQueueTrack = {
  id: string;
  titulo: string;
  artista: string;
  duracion: string;
  tipo: "spotify";
};

export type AirePlaybackQueueProps = {
  tracks: AireQueueTrack[];
  className?: string;
};

function totalDuracion(tracks: AireQueueTrack[]): string {
  let totalSec = 0;
  for (const t of tracks) {
    const m = /^(\d+):(\d+)$/.exec(t.duracion);
    if (m) totalSec += Number(m[1]) * 60 + Number(m[2]);
  }
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AirePlaybackQueue({ tracks, className }: AirePlaybackQueueProps): React.ReactElement {
  const [autoPlay, setAutoPlay] = useState(true);

  return (
    <section className={cn("dashboard-card border-white/[0.08] p-0", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4 md:px-6">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--primary)]">
          Cola de reproducción
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[color:var(--muted)] transition hover:border-[color:var(--primary)]/30 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Agregar a la cola
          </button>
          <button
            type="button"
            aria-label="Más opciones"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] text-[color:var(--muted)] transition hover:text-white"
          >
            <MoreVertical className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              <th className="w-10 px-5 py-3 md:px-6">#</th>
              <th className="px-3 py-3">Título</th>
              <th className="hidden px-3 py-3 sm:table-cell">Artista</th>
              <th className="px-3 py-3">Duración</th>
              <th className="px-5 py-3 md:px-6">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {tracks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-[color:var(--muted)] md:px-6">
                  Sin canciones en cola. Activá un slot DJ con Spotify conectado.
                </td>
              </tr>
            ) : null}
            {tracks.map((track, index) => {
              const activo = index === 0;
              return (
                <tr
                  key={track.id}
                  className={cn(
                    "border-b border-white/[0.04] transition-colors last:border-0",
                    activo && "bg-[color:var(--primary)]/[0.06]",
                  )}
                >
                  <td className="px-5 py-3.5 md:px-6">
                    {activo ? (
                      <Play className="h-3.5 w-3.5 fill-[color:var(--primary)] text-[color:var(--primary)]" aria-hidden />
                    ) : (
                      <span className="text-xs tabular-nums text-[color:var(--muted)]">{index + 1}</span>
                    )}
                  </td>
                  <td className={cn("px-3 py-3.5 font-medium", activo ? "text-[color:var(--primary)]" : "text-white")}>
                    {track.titulo}
                  </td>
                  <td className="hidden px-3 py-3.5 text-[color:var(--muted)] sm:table-cell">{track.artista}</td>
                  <td className="px-3 py-3.5 font-mono text-xs tabular-nums text-[color:var(--muted)]">
                    {track.duracion}
                  </td>
                  <td className="px-5 py-3.5 md:px-6">
                    <BrandLogo brand="spotify" size="xs" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <p className="text-xs text-[color:var(--muted)]">
          {tracks.length} canciones • {totalDuracion(tracks)}
        </p>
        <Switch
          checked={autoPlay}
          label="Reproducción automática"
          onChange={(e) => setAutoPlay(e.target.checked)}
        />
      </div>
    </section>
  );
}
