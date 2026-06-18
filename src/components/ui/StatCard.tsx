import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

export type StatCardProps = {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: boolean;
  className?: string;
  action?: { label: string; href: string };
  progress?: number;
  progressLabel?: string;
  hint?: string;
};

export function StatCard({
  label,
  value,
  icon,
  accent = false,
  className,
  action,
  progress,
  progressLabel,
  hint,
}: StatCardProps): React.ReactElement {
  return (
    <Card variant="stat" highlight={accent} interactive className={cn("space-y-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</p>
        {icon ? <span className="text-[color:var(--muted)]">{icon}</span> : null}
      </div>
      <p className="font-mono text-3xl font-bold leading-none tabular-nums text-[color:var(--text)]">{value}</p>
      {hint ? <p className="text-xs text-[color:var(--primary)]">{hint}</p> : null}
      {progress !== undefined ? (
        <Progress value={progress} label={progressLabel} />
      ) : progressLabel && progress === undefined ? (
        <p className="text-xs text-[color:var(--muted)]">{progressLabel}</p>
      ) : null}
      {action ? (
        <Link className="text-xs font-medium text-[color:var(--primary)] hover:brightness-110" href={action.href}>
          {action.label}
        </Link>
      ) : null}
    </Card>
  );
}
