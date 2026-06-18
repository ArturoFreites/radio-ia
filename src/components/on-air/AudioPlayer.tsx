"use client";

import { Loader2, Pause, Play } from "lucide-react";
import { Waveform } from "@/components/airon/Waveform";
import { cn } from "@/lib/utils";

export type AudioPlayerProps = {
  playing?: boolean;
  loading?: boolean;
  currentTime?: number;
  duration?: number;
  onTogglePlay?: () => void;
  showWaveform?: boolean;
  size?: "compact" | "large";
  className?: string;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AudioPlayer({
  playing = false,
  loading = false,
  currentTime = 0,
  duration = 0,
  onTogglePlay,
  showWaveform = false,
  size = "compact",
  className,
}: AudioPlayerProps): React.ReactElement {
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]",
        size === "large" ? "p-4" : "p-2.5",
        className,
      )}
    >
      <button
        type="button"
        aria-label={playing ? "Pausar" : "Reproducir"}
        disabled={loading}
        onClick={onTogglePlay}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-[color:var(--primary)] text-[color:var(--primary-foreground)] transition hover:brightness-95 disabled:opacity-40",
          size === "large" ? "h-12 w-12" : "h-9 w-9",
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </button>

      <div className="min-w-0 flex-1 space-y-1.5">
        {showWaveform ? <Waveform active={playing} size={size === "large" ? "lg" : "sm"} /> : null}
        <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--surface-2)]">
          <div className="h-full rounded-full bg-[color:var(--primary)] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between font-mono text-[10px] tabular-nums text-[color:var(--muted)]">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
