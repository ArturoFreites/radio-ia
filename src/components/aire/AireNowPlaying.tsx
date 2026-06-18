"use client";

import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { AireWaveformProgress } from "@/components/aire/AireWaveformProgress";
import { cn } from "@/lib/utils";

export type AireNowPlayingProps = {
  djNombre: string;
  playlistNombre: string;
  trackNombre: string | null;
  artistaNombre: string | null;
  coverUrl: string | null;
  coverFallida: boolean;
  onCoverError: () => void;
  positionMs: number;
  durationMs: number;
  paused: boolean;
  presentacionEstado: "idle" | "generando" | "lista";
  dialogoReproduciendo: boolean;
  nextTrackNombre: string | null;
  nextArtistaNombre: string | null;
  nextCoverUrl: string | null;
  nextCoverFallida: boolean;
  onNextCoverError: () => void;
  segundosHastaNext: number | null;
  volume: number;
  onVolumeChange: (v: number) => void;
  onTogglePlay: () => void;
  onSkip: () => void;
  onAbrirCabina?: () => void;
  autoDj?: boolean;
  onToggleAutoDj?: () => void;
  className?: string;
};

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function formatCountdown(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function AireNowPlaying({
  djNombre,
  playlistNombre,
  trackNombre,
  artistaNombre,
  coverUrl,
  coverFallida,
  onCoverError,
  positionMs,
  durationMs,
  paused,
  presentacionEstado,
  dialogoReproduciendo,
  nextTrackNombre,
  nextArtistaNombre,
  nextCoverUrl,
  nextCoverFallida,
  onNextCoverError,
  segundosHastaNext,
  volume,
  onVolumeChange,
  onTogglePlay,
  onSkip,
  onAbrirCabina,
  autoDj = true,
  onToggleAutoDj,
  className,
}: AireNowPlayingProps): React.ReactElement {
  void segundosHastaNext;
  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const countdownSec =
    durationMs > 0 ? Math.max(0, Math.ceil((durationMs - positionMs) / 1000)) : null;

  return (
    <section
      className={cn(
        "dashboard-card flex min-h-0 flex-1 flex-col overflow-hidden border-white/[0.08] p-0",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4 md:px-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--primary)]">
            Al aire
          </p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-white md:text-xl">
            DJ {djNombre}
          </h1>
        </div>
        {onAbrirCabina ? (
          <button
            type="button"
            onClick={onAbrirCabina}
            className="shrink-0 rounded-[var(--r-full)] border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-[color:var(--muted)] transition-colors hover:border-[color:var(--primary)]/30 hover:text-[color:var(--primary)]"
          >
            + Abrir cabina IA
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 p-5 md:flex-row md:gap-8 md:p-6">
        <div className="mx-auto w-full max-w-[200px] shrink-0 md:mx-0 md:max-w-[220px]">
          {coverUrl && !coverFallida ? (
            <div
              className="aspect-square w-full overflow-hidden shadow-[var(--shadow-hover)]"
              style={{ borderRadius: "var(--r-lg)" }}
            >
              <img
                src={coverUrl}
                alt=""
                className="h-full w-full object-cover"
                style={{ borderRadius: "var(--r-lg)" }}
                onError={onCoverError}
              />
            </div>
          ) : (
            <div
              className="flex aspect-square w-full items-center justify-center text-5xl text-white/90"
              style={{
                borderRadius: "var(--r-lg)",
                boxShadow: "var(--shadow-hover)",
                background: "linear-gradient(135deg, #7c3aed 0%, #db2777 55%, #f97316 100%)",
              }}
            >
              ♪
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--primary)]">
            Reproduciendo
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-white md:text-2xl">
            {trackNombre ?? "—"}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">{artistaNombre ?? ""}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-[color:var(--muted)]">
              {playlistNombre}
            </span>
            {presentacionEstado === "generando" ? (
              <span className="rounded-full border border-white/[0.08] bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium text-[color:var(--muted)]">
                Generando voz…
              </span>
            ) : null}
            {presentacionEstado === "lista" ? (
              <span className="rounded-full border border-[color:var(--success)]/25 bg-[color:var(--success)]/10 px-2.5 py-1 text-[10px] font-medium text-[color:var(--success)]">
                Voz lista ✓
              </span>
            ) : null}
            {dialogoReproduciendo ? (
              <span className="rounded-full border border-[color:var(--primary)]/25 bg-[color:var(--primary-glow)] px-2.5 py-1 text-[10px] font-medium text-[color:var(--primary)]">
                ▶ Reproduciendo
              </span>
            ) : null}
          </div>

          <div className="mt-5">
            <AireWaveformProgress progress={progress} className="h-10" />
            <div className="mt-2 flex items-center justify-between font-mono text-xs tabular-nums text-[color:var(--muted)]">
              <span>{fmt(positionMs)}</span>
              <span>{fmt(durationMs)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.08] px-5 py-4 md:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--primary)]">
              Próxima canción
            </p>
            <div className="mt-3 flex items-center gap-3">
              {nextCoverUrl && !nextCoverFallida ? (
                <img
                  src={nextCoverUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 object-cover shadow-[var(--shadow-card)]"
                  style={{ borderRadius: "var(--r-md)" }}
                  onError={onNextCoverError}
                />
              ) : (
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center bg-white/[0.06] text-lg text-[color:var(--muted)]"
                  style={{ borderRadius: "var(--r-md)", boxShadow: "var(--shadow-card)" }}
                >
                  ♪
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {nextTrackNombre ?? "Sin siguiente tema"}
                </p>
                <p className="truncate text-xs text-[color:var(--muted)]">{nextArtistaNombre ?? "—"}</p>
              </div>
            </div>
          </div>
          {countdownSec !== null && durationMs > 0 ? (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Comienza en
              </p>
              <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-[color:var(--primary)]">
                {formatCountdown(countdownSec)}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] bg-black/20 px-5 py-3 md:px-6">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 shrink-0 text-[color:var(--muted)]" aria-hidden />
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
            className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/[0.12] accent-[color:var(--primary)] md:w-32"
            aria-label="Volumen"
          />
        </div>

        <div className="flex items-center gap-2">
          <ControlIconButton label="Anterior" disabled>
            <SkipBack className="h-4 w-4" />
          </ControlIconButton>
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={paused ? "Reproducir" : "Pausar"}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--primary)] text-[color:var(--primary-foreground)] transition-opacity hover:opacity-90"
          >
            {paused ? <Play className="h-5 w-5 fill-current" /> : <Pause className="h-5 w-5 fill-current" />}
          </button>
          <ControlIconButton label="Siguiente" onClick={onSkip}>
            <SkipForward className="h-4 w-4" />
          </ControlIconButton>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleAutoDj}
            className={cn(
              "rounded-[var(--r-full)] border px-3 py-1.5 text-xs font-medium transition-colors",
              autoDj
                ? "border-[color:var(--primary)]/40 bg-[color:var(--primary-glow)] text-[color:var(--primary)]"
                : "border-white/[0.08] text-[color:var(--muted)]",
            )}
          >
            Auto DJ
          </button>
          <button
            type="button"
            className="rounded-[var(--r-full)] border border-[color:var(--danger)]/40 px-3 py-1.5 text-xs font-medium text-[color:var(--danger)] transition-colors hover:bg-[color:var(--live-glow)]"
          >
            Detener emisión
          </button>
        </div>
      </div>
    </section>
  );
}

function ControlIconButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] text-[color:var(--muted)] transition-colors",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:border-white/[0.16] hover:bg-white/[0.04] hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
