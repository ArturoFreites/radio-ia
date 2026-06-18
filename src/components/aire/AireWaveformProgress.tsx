"use client";

import { cn } from "@/lib/utils";

const BAR_HEIGHTS = [0.3, 0.55, 0.8, 0.45, 0.9, 0.6, 0.75, 0.4, 0.85, 0.5, 0.7, 0.35, 0.95, 0.55, 0.65, 0.8, 0.45, 0.7, 0.5, 0.85, 0.4, 0.6, 0.75, 0.55, 0.9, 0.35, 0.65, 0.8, 0.5, 0.7, 0.45, 0.85, 0.6, 0.75, 0.4, 0.9, 0.55, 0.7, 0.35, 0.8];

export type AireWaveformProgressProps = {
  progress: number;
  className?: string;
};

export function AireWaveformProgress({ progress, className }: AireWaveformProgressProps): React.ReactElement {
  const pct = Math.max(0, Math.min(1, progress));

  return (
    <div className={cn("flex h-8 items-end gap-[2px]", className)} aria-hidden>
      {BAR_HEIGHTS.map((h, i) => {
        const barPct = (i + 0.5) / BAR_HEIGHTS.length;
        const played = barPct <= pct;
        return (
          <span
            key={i}
            className={cn(
              "w-[3px] rounded-full transition-colors duration-300",
              played ? "bg-[color:var(--primary)]" : "bg-white/[0.12]",
            )}
            style={{ height: `${h * 100}%` }}
          />
        );
      })}
    </div>
  );
}
