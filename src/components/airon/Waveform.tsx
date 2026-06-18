import { cn } from "@/lib/utils";

export type WaveformProps = {
  bars?: number;
  active?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "live" | "purple";
};

const heights = ["35%", "70%", "45%", "90%", "55%", "80%", "40%", "65%"];

export function Waveform({
  bars = 8,
  active = true,
  className,
  size = "md",
  color = "primary",
}: WaveformProps): React.ReactElement {
  const sizeClass =
    size === "sm" ? "h-4 gap-0.5" : size === "lg" ? "h-10 gap-1" : "h-6 gap-0.5";

  return (
    <div className={cn("flex items-end", sizeClass, className)} aria-hidden>
      {Array.from({ length: bars }).map((_, index) => (
        <span
          key={index}
          className={cn(
            color === "live"
              ? "w-1 origin-bottom rounded-full bg-[color:var(--danger)]"
              : color === "purple"
                ? "w-1 origin-bottom rounded-full bg-[color:var(--purple)]"
                : "w-1 origin-bottom rounded-full bg-[color:var(--primary)]",
            active ? "animate-airon-wave" : "opacity-40",
          )}
          style={{
            height: heights[index % heights.length],
            animationDelay: active ? `${index * 0.08}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}
