"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

const BAR_HEIGHTS = [
  0.28, 0.52, 0.74, 0.38, 0.88, 0.62, 0.45, 0.92, 0.55, 0.7, 0.33, 0.85, 0.48, 0.78, 0.41,
  0.95, 0.58, 0.66, 0.82, 0.36, 0.9, 0.5, 0.72, 0.44, 0.86, 0.6, 0.75, 0.39, 0.91, 0.54,
  0.68, 0.42, 0.84, 0.57, 0.73, 0.46, 0.89, 0.63, 0.51, 0.8, 0.35, 0.94, 0.59, 0.67, 0.83,
  0.47, 0.77, 0.4, 0.87, 0.56, 0.71, 0.43, 0.93, 0.61, 0.69, 0.81, 0.37, 0.96, 0.53, 0.64,
  0.76, 0.49, 0.88, 0.65, 0.79, 0.34, 0.97, 0.6, 0.74, 0.45, 0.9, 0.58, 0.7, 0.82, 0.38,
  0.92, 0.55, 0.66, 0.84, 0.48, 0.78, 0.41, 0.86, 0.62, 0.5, 0.73, 0.44, 0.91, 0.57, 0.68,
  0.8, 0.36, 0.95, 0.52, 0.63, 0.75, 0.46, 0.89, 0.59, 0.72, 0.42, 0.87, 0.54, 0.67, 0.81,
];

export type AireBroadcastWaveformProps = {
  progress: number;
  elapsedLabel: string;
  totalLabel: string;
  className?: string;
};

export function AireBroadcastWaveform({
  progress,
  elapsedLabel,
  totalLabel,
  className,
}: AireBroadcastWaveformProps): React.ReactElement {
  const pct = Math.max(0, Math.min(1, progress));
  const playheadLeft = `${pct * 100}%`;

  const bars = useMemo(() => BAR_HEIGHTS, []);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-16 w-full">
        <div className="flex h-full items-end gap-[2px]" aria-hidden>
          {bars.map((h, i) => {
            const barPct = (i + 0.5) / bars.length;
            const played = barPct <= pct;
            return (
              <span
                key={i}
                className={cn(
                  "min-w-0 flex-1 rounded-sm transition-colors duration-300",
                  played ? "bg-[color:var(--primary)]" : "bg-white/[0.12]",
                )}
                style={{ height: `${Math.round(h * 100)}%` }}
              />
            );
          })}
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 top-0 w-px bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
          style={{ left: playheadLeft, transform: "translateX(-50%)" }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-xs tabular-nums text-[color:var(--muted)]">
        <span>{elapsedLabel}</span>
        <span>{totalLabel}</span>
      </div>
    </div>
  );
}
