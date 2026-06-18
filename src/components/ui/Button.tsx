import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-[var(--t-fast)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
  {
    variants: {
      variant: {
        primary:
          "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] hover:brightness-95 active:brightness-90",
        secondary:
          "bg-transparent border border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--surface-soft)]",
        ghost:
          "bg-transparent text-[color:var(--muted)] hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--text)]",
        danger:
          "bg-[color:var(--danger)]/15 border border-[color:var(--danger)]/40 text-[color:var(--danger)] hover:bg-[color:var(--danger)]/25",
        icon:
          "bg-[color:var(--surface-soft)] border border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--surface-2)] aspect-square p-0",
        filled:
          "bg-[color:var(--surface-soft)] border border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--surface-2)]",
        pill:
          "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] rounded-full hover:brightness-95",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-sm md:h-11",
        icon: "h-11 w-11 md:h-10 md:w-10",
      },
    },
    compoundVariants: [
      { variant: "icon", size: "sm", className: "h-9 w-9" },
      { variant: "icon", size: "md", className: "h-11 w-11" },
      { variant: "icon", size: "lg", className: "h-12 w-12" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

export type ButtonProps = {
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
} & VariantProps<typeof buttonVariants> &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  children,
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  icon,
  href,
  loading = false,
  className,
  disabled,
  ...props
}: ButtonProps): React.ReactElement {
  const resolvedSize = variant === "icon" ? "icon" : size;
  const leftIcon = iconLeft ?? icon;
  const classes = cn(buttonVariants({ variant, size: resolvedSize }), className);

  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && iconRight}
    </>
  );

  if (href) {
    return (
      <Link className={classes} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" {...props} className={classes} disabled={disabled || loading}>
      {content}
    </button>
  );
}

export { buttonVariants };
