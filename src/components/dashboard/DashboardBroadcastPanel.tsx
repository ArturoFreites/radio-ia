"use client";

import { Cloud, Clock, Megaphone } from "lucide-react";
import { SpotifyIcon } from "@/components/brand/SpotifyIcon";
import { useEffect, useMemo, useState } from "react";
import { calcularProximaInterrupcion } from "@/lib/aire/djInterrupciones";
import type { DjInterrupcionesConfig } from "@/lib/grilla/djConfigSchema";
import type { TipoInterrupcionDj } from "@/types/grilla";
import { cn } from "@/lib/utils";

function formatMinSec(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")} min`;
}

function iconoInterrupcion(tipo: TipoInterrupcionDj): React.ReactElement {
  if (tipo === "HORA") return <Clock className="h-4 w-4" aria-hidden />;
  if (tipo === "CLIMA") return <Cloud className="h-4 w-4" aria-hidden />;
  return <Megaphone className="h-4 w-4" aria-hidden />;
}

function labelInterrupcion(tipo: TipoInterrupcionDj): string {
  if (tipo === "HORA") return "Hora exacta";
  if (tipo === "CLIMA") return "Clima";
  return "Publicidad";
}

export type DashboardBroadcastPanelProps = {
  spotifyConectado: boolean;
  streamOnline: boolean;
  enVivo: boolean;
  radioCiudad?: string;
  djConfig: DjInterrupcionesConfig | null;
  className?: string;
};

export function DashboardBroadcastPanel({
  spotifyConectado,
  streamOnline,
  enVivo,
  radioCiudad,
  djConfig,
  className,
}: DashboardBroadcastPanelProps): React.ReactElement {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const proxima = useMemo(() => {
    if (!djConfig) return null;
    return calcularProximaInterrupcion(djConfig, {}, now);
  }, [djConfig, now]);

  const statusRows: Array<{
    label: string;
    value: string;
    ok: boolean;
    icon?: React.ReactNode;
  }> = [
    {
      label: "Estado",
      value: enVivo ? "En vivo" : "Fuera del aire",
      ok: enVivo,
    },
    {
      label: "Fuente activa",
      value: spotifyConectado ? "Spotify DJ" : "Programa IA",
      ok: true,
      icon: spotifyConectado ? <SpotifyIcon size="xs" /> : null,
    },
    {
      label: "Spotify",
      value: spotifyConectado ? "Conectado" : "Sin vincular",
      ok: spotifyConectado,
      icon: <SpotifyIcon branded={spotifyConectado} className={spotifyConectado ? undefined : "text-[color:var(--muted)]"} size="xs" />,
    },
    {
      label: "Cabina",
      value: streamOnline ? "En línea" : "Standby",
      ok: streamOnline,
    },
  ];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <section className="dashboard-card p-5">
        <h2 className="text-sm font-semibold text-white">Estado operativo</h2>
        <dl className="mt-4 space-y-3">
          {statusRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <dt className="text-sm text-[color:var(--muted)]">{row.label}</dt>
              <dd
                className={cn(
                  "inline-flex items-center gap-1.5 text-sm font-medium",
                  row.ok ? "text-[color:var(--primary)]" : "text-[color:var(--muted)]",
                )}
              >
                {row.icon}
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        {enVivo ? (
          <div className="mt-5 rounded-2xl border border-[color:var(--success)]/20 bg-[color:var(--success)]/8 px-4 py-3">
            <p className="text-sm font-semibold text-[color:var(--success)]">Slot en curso</p>
            <p className="mt-0.5 text-xs text-[color:var(--muted)]">La grilla indica transmisión activa</p>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)]/50 px-4 py-3">
            <p className="text-sm font-semibold text-[color:var(--muted)]">Sin slot activo</p>
            <p className="mt-0.5 text-xs text-[color:var(--muted)]">Esperando el próximo bloque programado</p>
          </div>
        )}
      </section>

      {proxima ? (
        <section className="dashboard-card p-5">
          <h2 className="text-sm font-semibold text-white">Próxima interrupción</h2>
          <div className="mt-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--purple)]/15 text-[color:var(--purple)]">
              {iconoInterrupcion(proxima.tipo)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{labelInterrupcion(proxima.tipo)}</p>
              {proxima.tipo === "CLIMA" && radioCiudad ? (
                <p className="mt-0.5 text-xs text-[color:var(--muted)]">{radioCiudad}</p>
              ) : null}
              <p className="mt-1 text-xs text-[color:var(--muted)]">En {formatMinSec(proxima.enMs)}</p>
              <span className="mt-2 inline-flex rounded-full border border-[color:var(--purple)]/25 bg-[color:var(--purple)]/12 px-2.5 py-0.5 text-[10px] font-medium text-[color:var(--purple)]">
                Automática
              </span>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
