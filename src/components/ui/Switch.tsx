"use client";

import { cn } from "@/lib/utils";

export type SwitchProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  description?: string;
};

export function Switch({
  label,
  description,
  className,
  id,
  ...props
}: SwitchProps): React.ReactElement {
  const inputId = id ?? props.name;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "flex items-center justify-between gap-4",
        props.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
      )}
    >
      {(label || description) ? (
        <span className="min-w-0 flex-1">
          {label ? <span className="block text-sm font-medium text-[color:var(--text)]">{label}</span> : null}
          {description ? (
            <span className="mt-0.5 block text-xs text-[color:var(--muted)]">{description}</span>
          ) : null}
        </span>
      ) : null}
      <span className="relative inline-flex shrink-0">
        <input
          {...props}
          id={inputId}
          type="checkbox"
          role="switch"
          className={cn("peer sr-only", className)}
        />
        <span
          aria-hidden
          className={cn(
            "block h-8 w-14 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] transition-colors md:h-7 md:w-12",
            "peer-checked:border-[color:var(--primary)] peer-checked:bg-[color:var(--primary)]/25",
            "peer-focus-visible:shadow-[var(--shadow-focus)]",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-0.5 top-0.5 h-7 w-7 rounded-full bg-[color:var(--muted)] transition-transform md:h-6 md:w-6",
            "peer-checked:translate-x-6 peer-checked:bg-[color:var(--primary)] md:peer-checked:translate-x-5",
          )}
        />
      </span>
    </label>
  );
}
