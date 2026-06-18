"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { AireBroadcastWaveform } from "@/components/aire-dashboard/AireBroadcastWaveform";
import { cn } from "@/lib/utils";

export type AireLiveNowCardProps = {
  programaNombre: string;
  djNombre: string;
  horario: string;
  enVivo: boolean;
  spotifyActivo: boolean;
  progress: number;
  elapsedLabel: string;
  totalLabel: string;
  coverGradient?: string;
  className?: string;
};

const DEFAULT_COVER =
  "linear-gradient(135deg, #7c3aed 0%, #db2777 55%, #f97316 100%)";

export function AireLiveNowCard({
  programaNombre,
  djNombre,
  horario,
  enVivo,
  spotifyActivo,
  progress,
  elapsedLabel,
  totalLabel,
  coverGradient = DEFAULT_COVER,
  className,
}: AireLiveNowCardProps): React.ReactElement {
  return (
    <section
      className={cn(
        "dashboard-card overflow-hidden border-white/[0.08] p-0",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4 md:px-6">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--primary)]">
          En vivo ahora
        </h2>
        {enVivo ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/10 px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--danger)] animate-airon-pulse-dot" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white">En vivo</span>
          </span>
        ) : (
          <span className="text-[10px] font-medium uppercase tracking-widest text-[color:var(--muted)]">
            Standby
          </span>
        )}
      </div>

      <div className="flex flex-col gap-6 p-5 md:flex-row md:gap-8 md:p-6">
        <div
          className="mx-auto aspect-square w-full max-w-[200px] shrink-0 overflow-hidden rounded-2xl shadow-[var(--shadow-hover)] md:mx-0 md:max-w-[220px]"
          style={{ background: coverGradient }}
          aria-hidden
        />

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--primary)]">
            Programa actual
          </p>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            {programaNombre}
          </h3>
          <p className="mt-1 text-sm text-[color:var(--muted)]">{djNombre}</p>
          <p className="mt-3 font-mono text-sm tabular-nums text-white/90">{horario}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-[color:var(--muted)]">
              128 kbps
            </span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-[color:var(--muted)]">
              HD
            </span>
            {spotifyActivo ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1db954]/30 bg-[#1db954]/10 px-2.5 py-1 text-[10px] font-medium text-[#1ed760]">
                <BrandLogo brand="spotify" size="xs" />
                Spotify
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.08] px-5 py-4 md:px-6 md:py-5">
        <AireBroadcastWaveform
          elapsedLabel={elapsedLabel}
          progress={progress}
          totalLabel={totalLabel}
        />
      </div>
    </section>
  );
}
