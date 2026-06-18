"use client";

import { useEffect, useState } from "react";
import { AironLogo } from "@/components/brand/AironLogo";
import { cn } from "@/lib/utils";

function formatBroadcastDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export type AireHeaderProps = {
  enVivo?: boolean;
  oyentes?: number;
  className?: string;
};

export function AireHeader({ enVivo = true, oyentes = 0, className }: AireHeaderProps): React.ReactElement {
  const [duracionSec, setDuracionSec] = useState(0);

  useEffect(() => {
    if (!enVivo) return undefined;
    const id = window.setInterval(() => setDuracionSec((d) => d + 1), 1000);
    return () => window.clearInterval(id);
  }, [enVivo]);

  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between gap-4 border-b border-[#1a1a1a] px-4 py-3 md:px-6",
        className,
      )}
    >
      <AironLogo size="sm" />

      <div className="flex items-center gap-3 md:gap-5">
        {enVivo ? (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1"
            style={{
              background: "rgba(239,77,109,.12)",
              border: "1px solid rgba(239,77,109,.3)",
              borderRadius: "var(--r-full)",
            }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--danger)]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--danger)]">
              En vivo
            </span>
          </div>
        ) : null}

        <span className="hidden font-mono text-lg font-semibold tabular-nums tracking-tight text-white sm:inline">
          {formatBroadcastDuration(duracionSec)}
        </span>

        <div className="hidden items-center gap-2 md:flex">
          <span className="text-xs text-[color:var(--muted)]">Oyentes conectados</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[color:var(--success)]" />
            <span className="font-mono text-sm font-semibold tabular-nums text-[color:var(--primary)]">
              {oyentes > 0 ? oyentes.toLocaleString("es-AR") : "—"}
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
