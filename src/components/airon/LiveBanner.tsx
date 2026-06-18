"use client";

import { Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Waveform } from "@/components/airon/Waveform";
import { isoHoraInicioArgentina } from "@/lib/grilla/tiempo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export type LiveBannerState = "active" | "idle" | "nextSoon" | "error";

export type LiveBannerProps = {
  state?: LiveBannerState;
  slotNombre?: string;
  playlistNombre?: string;
  horario?: string;
  countdown?: string;
  aireHref?: string;
  onOpenAire?: () => void;
  className?: string;
};

export function LiveBanner({
  state = "idle",
  slotNombre,
  playlistNombre,
  horario,
  countdown,
  aireHref,
  onOpenAire,
  className,
}: LiveBannerProps): React.ReactElement {
  const isLive = state === "active";
  const isNextSoon = state === "nextSoon";

  return (
    <Card
      variant={isLive ? "live" : "elevated"}
      className={cn(
        "relative overflow-hidden p-5 md:p-6",
        isNextSoon ? "border-[color:var(--warning)]/50" : undefined,
        className,
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {isLive ? (
              <Badge label="En vivo" pulse variant="live" />
            ) : state === "error" ? (
              <Badge label="Error" variant="error" />
            ) : isNextSoon ? (
              <Badge label="Próximo pronto" variant="pending" />
            ) : (
              <Badge label="Sin transmisión" variant="idle" />
            )}
          </div>

          {slotNombre ? (
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[color:var(--text)] md:text-3xl">{slotNombre}</h2>
              {playlistNombre ? (
                <p className="mt-1 text-sm text-[color:var(--muted)]">{playlistNombre}</p>
              ) : null}
              {horario ? (
                <p className="mt-1 font-mono text-sm tabular-nums text-[color:var(--muted)]">{horario}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-lg text-[color:var(--muted)]">No hay un slot activo en la grilla de hoy.</p>
          )}

          <div className="flex flex-wrap items-end gap-4">
            <Waveform active={isLive} color={isLive ? "live" : "primary"} size="lg" />
            {countdown ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                  Countdown
                </p>
                <p className="font-mono text-2xl font-bold tabular-nums text-[color:var(--text)]">{countdown}</p>
              </div>
            ) : null}
          </div>
        </div>

        {(aireHref || onOpenAire) ? (
          <Button
            className="w-full shrink-0 md:w-auto"
            iconLeft={<Radio className="h-4 w-4" aria-hidden />}
            href={aireHref}
            onClick={onOpenAire}
            size="lg"
          >
            Ir a On Air
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

/** Compat wrapper for existing dashboard usage */
export type VivoBannerLegacyProps = {
  slotActual: { nombre: string; horaInicio: string; horaFin: string; playlistNombre?: string } | null;
  proximoSlot: { nombre: string; horaInicio: string } | null;
  aireToken: string | null;
};

const TZ_AR = "America/Argentina/Buenos_Aires";

function horaDisplayDesdeIso(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ_AR,
  }).format(new Date(iso));
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LiveBannerFromLegacy({
  slotActual,
  proximoSlot,
  aireToken,
}: VivoBannerLegacyProps): React.ReactElement {
  const [now, setNow] = useState<number>(() => Date.now());
  const aireWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    if (!proximoSlot?.horaInicio) {
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [proximoSlot?.horaInicio]);

  const msToNext = proximoSlot?.horaInicio
    ? new Date(proximoSlot.horaInicio).getTime() - now
    : null;

  const msHastaFinSlot = slotActual?.horaFin
    ? new Date(isoHoraInicioArgentina(new Date(now), slotActual.horaFin)).getTime() - now
    : null;

  const countdownMs = slotActual && msHastaFinSlot !== null && msHastaFinSlot > 0
    ? msHastaFinSlot
    : msToNext !== null && msToNext > 0
      ? msToNext
      : null;
  const countdown = countdownMs !== null ? formatCountdown(countdownMs) : undefined;
  const nextSoon = !slotActual && msToNext !== null && msToNext > 0 && msToNext <= 15 * 60 * 1000;

  return (
    <LiveBanner
      state={slotActual ? "active" : nextSoon ? "nextSoon" : "idle"}
      slotNombre={slotActual?.nombre ?? proximoSlot?.nombre}
      playlistNombre={slotActual?.playlistNombre}
      horario={
        slotActual
          ? `${slotActual.horaInicio} – ${slotActual.horaFin}`
          : proximoSlot
            ? `A las ${horaDisplayDesdeIso(proximoSlot.horaInicio)}`
            : undefined
      }
      countdown={countdown}
      onOpenAire={
        aireToken
          ? () => {
              if (aireWindowRef.current && !aireWindowRef.current.closed) {
                aireWindowRef.current.focus();
              } else {
                aireWindowRef.current = window.open(
                  `/cabina?token=${encodeURIComponent(aireToken)}`,
                  "aire_vivo",
                );
              }
            }
          : undefined
      }
    />
  );
}
