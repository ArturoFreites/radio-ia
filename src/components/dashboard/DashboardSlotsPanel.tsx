"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Waveform } from "@/components/airon/Waveform";
import { slotArtworkGradient } from "@/lib/dashboard/slotArtwork";
import type { DashboardSlotItem } from "@/lib/dashboard/slotItems";
import { cn } from "@/lib/utils";

export type { DashboardSlotItem } from "@/lib/dashboard/slotItems";

export type DashboardSlotsPanelProps = {
  slots: DashboardSlotItem[];
  className?: string;
};

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

function formatRelativeCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) {
    return `En ${h}:${String(m).padStart(2, "0")} hs`;
  }
  return `En ${m}:${String(totalSec % 60).padStart(2, "0")} min`;
}

function useNowTick(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [enabled]);
  return now;
}

export function DashboardSlotsPanel({ slots, className }: DashboardSlotsPanelProps): React.ReactElement {
  const hasTick = slots.some((slot) => slot.countdownTargetIso);
  const now = useNowTick(hasTick);

  return (
    <section className={cn("dashboard-card flex min-h-[520px] flex-col overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-[color:var(--border)] px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Próximos slots</h2>
          <p className="mt-0.5 text-sm text-[color:var(--muted)]">Programación del día en curso</p>
        </div>
        <Link
          className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--muted)] transition hover:text-white"
          href="/grilla"
        >
          Ver grilla
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <ul className="flex-1 space-y-2 overflow-y-auto p-4">
        {slots.map((slot) => {
          const msLeft = slot.countdownTargetIso
            ? new Date(slot.countdownTargetIso).getTime() - now
            : null;
          const countdown =
            msLeft !== null && msLeft > 0
              ? slot.activo
                ? formatCountdown(msLeft)
                : formatRelativeCountdown(msLeft)
              : null;

          return (
            <li
              key={slot.id}
              className={cn(
                "flex items-center gap-4 rounded-2xl border p-4 transition-colors",
                slot.activo
                  ? "border-[color:var(--primary)]/40 bg-[color:var(--primary-glow)] shadow-[0_0_32px_rgba(194,252,74,0.08)]"
                  : "border-[color:var(--border)] bg-[color:var(--surface-soft)]/40",
                slot.pasado && "opacity-45",
              )}
            >
              <div
                className="h-16 w-16 shrink-0 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                style={{ background: slotArtworkGradient(slot.id) }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {slot.activo ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--primary)]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--primary)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--primary)] animate-airon-pulse-dot" />
                      En vivo
                    </span>
                  ) : null}
                  <p className="truncate text-base font-semibold text-white">{slot.nombre}</p>
                </div>
                <p className="mt-0.5 truncate text-sm text-[color:var(--muted)]">{slot.djNombre}</p>
                <p className="mt-1 font-mono text-xs tabular-nums text-[color:var(--muted)]">
                  {slot.horaInicio} – {slot.horaFin}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {slot.activo ? <Waveform active bars={5} color="primary" size="sm" /> : null}
                {countdown ? (
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                      {slot.activo ? "Restante" : "Comienza"}
                    </p>
                    <p className="font-mono text-sm font-semibold tabular-nums text-white">{countdown}</p>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
        {slots.length === 0 ? (
          <li className="px-4 py-16 text-center text-sm text-[color:var(--muted)]">
            No hay slots programados para hoy
          </li>
        ) : null}
      </ul>
    </section>
  );
}
