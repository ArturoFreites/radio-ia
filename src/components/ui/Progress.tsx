import { cn } from "@/lib/utils";

export type ProgressProps = {
  value: number;
  className?: string;
  barClassName?: string;
  label?: string;
};

export function Progress({ value, className, barClassName, label }: ProgressProps): React.ReactElement {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <div className="mb-1.5 flex justify-between text-xs text-[color:var(--muted)]">
          <span>{label}</span>
          <span className="font-mono tabular-nums">{Math.round(pct)}%</span>
        </div>
      ) : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]">
        <div
          className={cn(
            "h-full rounded-full bg-[color:var(--primary)] transition-all duration-500",
            barClassName,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export type CircularProgressProps = {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export function CircularProgress({
  value,
  size = 48,
  strokeWidth = 4,
  className,
}: CircularProgressProps): React.ReactElement {
  const pct = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width={size} height={size} className={className} aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--surface-2)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
