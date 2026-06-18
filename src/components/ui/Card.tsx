import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-[var(--r-2xl)] border bg-[color:var(--surface)] shadow-[var(--shadow-card)] transition-[box-shadow,background,border-color] duration-[var(--t-base)] w-full",
  {
    variants: {
      variant: {
        base: "border-[color:var(--border)] p-4",
        elevated: "border-[color:var(--border)] p-4 shadow-[var(--shadow-hover)]",
        stat: "border-[color:var(--border)] p-4 md:p-5",
        media: "border-[color:var(--border)] overflow-hidden p-0",
        live: "border-[color:var(--danger)]/40 p-4 shadow-[0_0_24px_var(--live-glow)]",
        danger: "border-[color:var(--danger)]/50 p-4",
      },
      interactive: {
        true: "hover:bg-[color:var(--surface-soft)] hover:shadow-[var(--shadow-hover)] cursor-pointer",
        false: "",
      },
    },
    defaultVariants: {
      variant: "base",
      interactive: false,
    },
  },
);

export type CardVariant = NonNullable<VariantProps<typeof cardVariants>["variant"]>;

export type CardProps = {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
} & VariantProps<typeof cardVariants> &
  React.HTMLAttributes<HTMLElement>;

export function Card({
  children,
  className,
  variant = "base",
  interactive = false,
  highlight = false,
  ...props
}: CardProps): React.ReactElement {
  const resolvedVariant = highlight && variant === "base" ? "live" : variant;

  return (
    <section {...props} className={cn(cardVariants({ variant: resolvedVariant, interactive }), className)}>
      {children}
    </section>
  );
}

export { cardVariants };
