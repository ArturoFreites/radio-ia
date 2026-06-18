import Link from "next/link";
import { Sparkline, type SparklineTone } from "@/components/dashboard/Sparkline";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

export type DashboardKpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: SparklineTone;
  progress?: number;
  progressLabel?: string;
  href?: string;
  className?: string;
};

export function DashboardKpiCard({
  label,
  value,
  hint,
  tone = "lime",
  progress,
  progressLabel,
  href,
  className,
}: DashboardKpiCardProps): React.ReactElement {
  const content = (
    <>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--muted)]">
        {label}
      </p>
      <p className="mt-3 font-mono text-[2rem] font-semibold leading-none tracking-tight text-white">
        {value}
      </p>
      {hint ? (
        <p
          className={cn(
            "mt-2 text-xs font-medium",
            hint.startsWith("+") || hint.startsWith("En vivo")
              ? "text-[color:var(--primary)]"
              : "text-[color:var(--muted)]",
          )}
        >
          {hint}
        </p>
      ) : null}
      {progress !== undefined ? (
        <div className="mt-4">
          <Progress barClassName="bg-[color:var(--primary)]" value={progress} label={progressLabel} />
        </div>
      ) : (
        <div className="mt-4">
          <Sparkline tone={tone} />
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        className={cn(
          "dashboard-card block p-5 transition hover:bg-[color:var(--surface-soft)] hover:shadow-[var(--shadow-hover)]",
          className,
        )}
        href={href}
      >
        {content}
      </Link>
    );
  }

  return <article className={cn("dashboard-card p-5", className)}>{content}</article>;
}
