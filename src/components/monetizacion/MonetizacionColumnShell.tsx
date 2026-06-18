import { cn } from "@/lib/utils";

export type MonetizacionColumnShellProps = {
  icon: React.ReactNode;
  iconClassName?: string;
  title: string;
  description: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  actionLabel?: string;
  onAction?: () => void;
  filters?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function MonetizacionColumnShell({
  icon,
  iconClassName,
  title,
  description,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  actionLabel,
  onAction,
  filters,
  children,
  footer,
  className,
}: MonetizacionColumnShellProps): React.ReactElement {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-[var(--r-xl)] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="border-b border-[color:var(--border)] p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              iconClassName ?? "bg-[color:var(--purple)]/15 text-[color:var(--purple)]",
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[color:var(--text)]">{title}</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--muted)]">{description}</p>
          </div>
        </div>

        {searchPlaceholder || actionLabel ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {searchPlaceholder ? (
              <input
                type="search"
                value={searchValue ?? ""}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 min-w-0 flex-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 text-sm text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:outline-none focus:shadow-[var(--shadow-focus)]"
              />
            ) : null}
            {actionLabel && onAction ? (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:brightness-95"
              >
                {actionLabel}
              </button>
            ) : null}
          </div>
        ) : null}

        {filters ? <div className="mt-3">{filters}</div> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>

      {footer ? (
        <div className="border-t border-[color:var(--border)] p-3">{footer}</div>
      ) : null}
    </section>
  );
}
