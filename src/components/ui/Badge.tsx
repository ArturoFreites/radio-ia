import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        live: "bg-[color:var(--danger)]/15 text-[color:var(--danger)] border border-[color:var(--danger)]/30",
        ready: "bg-[color:var(--success)]/15 text-[color:var(--success)] border border-[color:var(--success)]/30",
        generating: "bg-[color:var(--purple)]/15 text-[color:var(--purple)] border border-[color:var(--purple)]/30",
        pending: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border border-[color:var(--warning)]/30",
        error: "bg-[color:var(--danger)]/15 text-[color:var(--danger)] border border-[color:var(--danger)]/30",
        dj: "bg-[color:var(--cyan)]/15 text-[color:var(--cyan)] border border-[color:var(--cyan)]/30",
        idle: "bg-[color:var(--surface-2)] text-[color:var(--muted)] border border-[color:var(--border)]",
        paid: "bg-[color:var(--success)]/15 text-[color:var(--success)] border border-[color:var(--success)]/30",
        unpaid: "bg-[color:var(--danger)]/15 text-[color:var(--danger)] border border-[color:var(--danger)]/30",
        partial: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border border-[color:var(--warning)]/30",
        online: "bg-[color:var(--success)]/15 text-[color:var(--success)] border border-[color:var(--success)]/30",
        offline: "bg-[color:var(--surface-2)] text-[color:var(--muted)] border border-[color:var(--border)]",
        draft: "bg-[color:var(--surface-2)] text-[color:var(--muted)] border border-[color:var(--border)]",
        warning: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border border-[color:var(--warning)]/30",
      },
    },
    defaultVariants: {
      variant: "idle",
    },
  },
);

const dotVariants: Record<NonNullable<VariantProps<typeof badgeVariants>["variant"]>, string> = {
  live: "bg-[color:var(--danger)]",
  ready: "bg-[color:var(--success)]",
  generating: "bg-[color:var(--purple)]",
  pending: "bg-[color:var(--warning)]",
  error: "bg-[color:var(--danger)]",
  dj: "bg-[color:var(--cyan)]",
  idle: "bg-[color:var(--muted)]",
  paid: "bg-[color:var(--success)]",
  unpaid: "bg-[color:var(--danger)]",
  partial: "bg-[color:var(--warning)]",
  online: "bg-[color:var(--success)]",
  offline: "bg-[color:var(--muted)]",
  draft: "bg-[color:var(--muted)]",
  warning: "bg-[color:var(--warning)]",
};

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export type BadgeProps = {
  variant: BadgeVariant;
  label: string;
  pulse?: boolean;
  showDot?: boolean;
  className?: string;
};

export function Badge({
  variant,
  label,
  pulse = false,
  showDot = true,
  className,
}: BadgeProps): React.ReactElement {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {showDot ? (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            dotVariants[variant],
            pulse ? "animate-airon-pulse-dot" : undefined,
          )}
          aria-hidden
        />
      ) : null}
      {label}
    </span>
  );
}

export { badgeVariants };
