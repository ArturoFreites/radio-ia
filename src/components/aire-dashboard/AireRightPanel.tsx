"use client";

import { Cloud, Clock, Globe, Megaphone, Pause, Power, Scissors, Signal, Volume2, Waves } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { calcularProximaInterrupcion } from "@/lib/aire/djInterrupciones";
import type { DjInterrupcionesConfig } from "@/lib/grilla/djConfigSchema";
import type { TipoInterrupcionDj } from "@/types/grilla";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";

export type AireRightPanelProps = {
  segundosRestantes: number | null;
  transmitiendo: boolean;
  spotifyActivo: boolean;
  djConfig?: DjInterrupcionesConfig | null;
  radioCiudad?: string;
  voiceId?: string | null;
  onDemoPublicidad?: () => void;
  className?: string;
};

function formatMinSec(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")} min`;
}

function iconoInterrupcion(tipo: TipoInterrupcionDj): React.ReactElement {
  if (tipo === "HORA") return <Clock className="h-4 w-4" aria-hidden />;
  if (tipo === "CLIMA") return <Cloud className="h-4 w-4" aria-hidden />;
  if (tipo === "AUDIO") return <Volume2 className="h-4 w-4" aria-hidden />;
  return <Megaphone className="h-4 w-4" aria-hidden />;
}

function labelInterrupcion(tipo: TipoInterrupcionDj): string {
  if (tipo === "HORA") return "Hora exacta";
  if (tipo === "CLIMA") return "Clima";
  if (tipo === "AUDIO") return "Audio";
  return "Publicidad";
}

function formatHms(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function AireRightPanel({
  segundosRestantes,
  transmitiendo,
  spotifyActivo,
  djConfig = null,
  radioCiudad,
  voiceId = null,
  onDemoPublicidad,
  className,
}: AireRightPanelProps): React.ReactElement {
  const [countdown, setCountdown] = useState(segundosRestantes ?? 0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setCountdown(segundosRestantes ?? 0);
  }, [segundosRestantes]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (segundosRestantes === null) return;
    const id = window.setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [segundosRestantes]);

  const proximaInterrupcion = useMemo(() => {
    if (!djConfig || !voiceId) return null;
    return calcularProximaInterrupcion(djConfig, {}, now);
  }, [djConfig, voiceId, now]);

  const statusRows = [
    { label: "Estado", value: transmitiendo ? "Transmitiendo" : "Standby" },
    {
      label: "Fuente de audio",
      value: spotifyActivo ? "Spotify" : "Sin fuente",
      icon: spotifyActivo ? <BrandLogo brand="spotify" size="xs" /> : null,
    },
    {
      label: "Conexión",
      value: transmitiendo ? "Activa" : "Inactiva",
      icon: <Signal className="h-3.5 w-3.5" aria-hidden />,
    },
    { label: "Salida", value: "Navegador → OBS", icon: <Globe className="h-3.5 w-3.5" aria-hidden /> },
  ];

  const interrupcionesActivas =
    djConfig &&
    (djConfig.djHoraActiva || djConfig.djClimaActivo || djConfig.djPublicidadActiva || djConfig.djAudioActiva);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <section className="dashboard-card border-white/[0.08] p-5 md:p-6">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">
          Tiempo restante
        </h2>
        <p className="mt-3 font-mono text-4xl font-semibold tabular-nums tracking-tight text-[color:var(--primary)] shadow-[0_0_40px_var(--primary-glow)]">
          {segundosRestantes !== null ? formatHms(countdown) : "—"}
        </p>
        <p className="mt-1 text-sm text-[color:var(--muted)]">del slot actual</p>
      </section>

      <section className="dashboard-card border-white/[0.08] p-5 md:p-6">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--primary)]">
          Estado de transmisión
        </h2>
        <dl className="mt-4 space-y-3">
          {statusRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-[color:var(--muted)]">{row.label}</dt>
              <dd className="inline-flex items-center gap-1.5 font-medium text-[color:var(--primary)]">
                {row.icon}
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {interrupcionesActivas ? (
        <section className="dashboard-card border-white/[0.08] p-5 md:p-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--primary)]">
            Interrupciones en vivo
          </h2>
          {!voiceId ? (
            <p className="mt-3 text-sm text-[color:var(--warning)]">
              Asigná un locutor al slot para activar hora, clima y publicidad.
            </p>
          ) : proximaInterrupcion ? (
            <div className="mt-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--purple)]/15 text-[color:var(--purple)]">
                {iconoInterrupcion(proximaInterrupcion.tipo)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{labelInterrupcion(proximaInterrupcion.tipo)}</p>
                {proximaInterrupcion.tipo === "CLIMA" && radioCiudad ? (
                  <p className="mt-0.5 text-xs text-[color:var(--muted)]">{radioCiudad}</p>
                ) : null}
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  Próxima en {formatMinSec(proximaInterrupcion.enMs)}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[color:var(--muted)]">Sin interrupciones configuradas en el slot.</p>
          )}
          <ul className="mt-4 space-y-2 text-xs text-[color:var(--muted)]">
            {djConfig?.djHoraActiva && djConfig.djHoraIntervaloMin !== null ? (
              <li>Hora — cada {djConfig.djHoraIntervaloMin} min</li>
            ) : null}
            {djConfig?.djClimaActivo && djConfig.djClimaIntervaloMin !== null ? (
              <li>Clima — cada {djConfig.djClimaIntervaloMin} min</li>
            ) : null}
            {djConfig?.djPublicidadActiva && djConfig.djPublicidadIntervaloMin !== null ? (
              <li>Publicidad — cada {djConfig.djPublicidadIntervaloMin} min</li>
            ) : null}
            {djConfig?.djAudioActiva && djConfig.djAudioIntervaloMin !== null ? (
              <li>Audios — cada {djConfig.djAudioIntervaloMin} min</li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {onDemoPublicidad ? (
        <section className="dashboard-card border-white/[0.08] p-5 md:p-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--primary)]">
            Acciones
          </h2>
          <button
            type="button"
            onClick={onDemoPublicidad}
            className="mt-4 w-full rounded-2xl border border-white/[0.08] bg-[color:var(--surface-soft)] px-4 py-3 text-sm font-medium text-white transition hover:border-[color:var(--primary)]/35 hover:bg-[color:var(--primary-glow)]"
          >
            Demo publicidad
          </button>
        </section>
      ) : null}

      <section className="dashboard-card border-white/[0.08] p-5 md:p-6 opacity-50">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--primary)]">
          Controles rápidos
        </h2>
        <p className="mt-2 text-xs text-[color:var(--muted)]">
          Pausa, fade y micrófono se controlan desde el reproductor Spotify.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 pointer-events-none">
          {[
            { label: "Pausa", icon: Pause },
            { label: "Corte rápido", icon: Scissors },
            { label: "Fade out", icon: Waves },
            { label: "Auto DJ", icon: Power },
          ].map((control) => {
            const Icon = control.icon;
            return (
              <div
                key={control.label}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-[color:var(--surface-soft)] px-3 py-4"
              >
                <Icon className="h-5 w-5 text-[color:var(--muted)]" aria-hidden />
                <span className="text-center text-[11px] font-medium text-[color:var(--muted)]">
                  {control.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
