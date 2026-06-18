"use client";

import { Cloud, Clock, Megaphone, Mic, SkipForward, Volume2, Zap } from "lucide-react";
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

type StatusRow = { label: string; value: string; ok?: boolean; icon?: React.ReactNode };

export type AireBroadcastSidebarProps = {
  spotifyConectado: boolean;
  djConfig: DjInterrupcionesConfig | null;
  onDemoPublicidad: () => void;
  className?: string;
};

export function AireBroadcastSidebar({
  spotifyConectado,
  djConfig,
  onDemoPublicidad,
  className,
}: AireBroadcastSidebarProps): React.ReactElement {
  const [now, setNow] = useState(() => Date.now());
  const [vuLevel, setVuLevel] = useState(0.65);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setVuLevel(0.35 + Math.random() * 0.55);
    }, 180);
    return () => window.clearInterval(id);
  }, []);

  const proxima = useMemo(() => {
    if (!djConfig) return null;
    return calcularProximaInterrupcion(djConfig, {}, now);
  }, [djConfig, now]);

  const statusRows: StatusRow[] = [
    {
      label: "Fuente de audio",
      value: spotifyConectado ? "Spotify" : "—",
      ok: spotifyConectado,
      icon: spotifyConectado ? <SpotifyIcon size="xs" /> : null,
    },
    { label: "Conexión", value: spotifyConectado ? "Óptima" : "Sin sesión", ok: spotifyConectado },
    { label: "Calidad stream", value: "128 kbps", ok: true },
    { label: "Servidor", value: "Airon Edge", ok: true },
  ];

  const vuBars = 24;
  const activeBars = Math.round(vuLevel * vuBars);

  return (
    <aside
      className={cn(
        "hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto lg:flex",
        className,
      )}
    >
      <section className="rounded-[var(--r-lg)] border border-[#1e1e1e] bg-[#0d0d0d] p-4">
        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
          Estado de emisión
        </h2>
        <dl className="space-y-2.5">
          {statusRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2">
              <dt className="text-xs text-[color:var(--muted)]">{row.label}</dt>
              <dd
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-semibold",
                  row.ok ? "text-[color:var(--primary)]" : "text-zinc-500",
                )}
              >
                {row.icon}
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-[var(--r-lg)] border border-[#1e1e1e] bg-[#0d0d0d] p-4">
        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
          Controles rápidos
        </h2>
        <div className="space-y-2">
          <QuickControlButton icon={<Mic className="h-4 w-4" />} label="Encender micrófono" disabled />
          <QuickControlButton icon={<Zap className="h-4 w-4" />} label="Forzar interrupción" disabled />
          <QuickControlButton icon={<Megaphone className="h-4 w-4" />} label="Demo publicidad" onClick={onDemoPublicidad} />
          <QuickControlButton icon={<SkipForward className="h-4 w-4" />} label="Saltar tema" disabled />
          <QuickControlButton icon={<Volume2 className="h-4 w-4" />} label="Ajustar volumen" disabled />
        </div>
      </section>

      <section className="rounded-[var(--r-lg)] border border-[#1e1e1e] bg-[#0d0d0d] p-4">
        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
          Nivel de audio
        </h2>
        <div className="flex items-end gap-0.5" aria-hidden>
          {Array.from({ length: vuBars }).map((_, i) => {
            const active = i < activeBars;
            let barColor = "bg-[color:var(--success)]";
            if (i > vuBars * 0.7) barColor = "bg-[color:var(--warning)]";
            if (i > vuBars * 0.85) barColor = "bg-[color:var(--danger)]";
            return (
              <span
                key={i}
                className={cn("w-1.5 rounded-sm transition-all duration-150", active ? barColor : "bg-[#1e1e1e]")}
                style={{ height: `${8 + (i % 5) * 3}px` }}
              />
            );
          })}
        </div>
        <p className="mt-2 font-mono text-xs tabular-nums text-[color:var(--primary)]">-8.5 LUFS</p>
      </section>

      {proxima ? (
        <section className="rounded-[var(--r-lg)] border border-[#1e1e1e] bg-[#0d0d0d] p-4">
          <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">
            Próxima interrupción
          </h2>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[color:var(--purple)]/20 text-[color:var(--purple)]">
              {iconoInterrupcion(proxima.tipo)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{labelInterrupcion(proxima.tipo)}</p>
              <p className="mt-0.5 text-xs text-[color:var(--muted)]">En {formatMinSec(proxima.enMs)}</p>
              <span
                className="mt-2 inline-block text-[10px] font-medium text-[color:var(--purple)]"
                style={{
                  borderRadius: "var(--r-full)",
                  padding: "2px 8px",
                  background: "rgba(139,92,246,.15)",
                  border: "1px solid rgba(139,92,246,.25)",
                }}
              >
                Automática
              </span>
            </div>
          </div>
        </section>
      ) : null}
    </aside>
  );
}

type QuickControlButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
};

function QuickControlButton({ icon, label, onClick, disabled }: QuickControlButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-[var(--r-md)] border border-[#2a2a2a] bg-[#111] px-3 py-2.5 text-left text-xs text-zinc-300 transition-colors",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:border-[#3a3a3a] hover:bg-[#1a1a1a] hover:text-white",
      )}
    >
      <span className="text-[color:var(--muted)]">{icon}</span>
      {label}
    </button>
  );
}
