import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--surface-soft)] text-[color:var(--muted)]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[color:var(--text)]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-[color:var(--muted)]">{description}</p>
      {actionLabel ? (
        <div className="mt-6 w-full max-w-xs">
          {actionHref ? (
            <Button className="w-full" href={actionHref} size="lg">
              {actionLabel}
            </Button>
          ) : (
            <Button className="w-full" size="lg" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
