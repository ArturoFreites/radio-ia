import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  description?: string;
};

export function Checkbox({
  label,
  description,
  className,
  id,
  ...props
}: CheckboxProps): React.ReactElement {
  const inputId = id ?? props.name;

  return (
    <label
      htmlFor={inputId}
      className={cn("flex cursor-pointer items-start gap-3", props.disabled ? "opacity-40 cursor-not-allowed" : undefined)}
    >
      <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          {...props}
          id={inputId}
          type="checkbox"
          className={cn(
            "peer h-5 w-5 appearance-none rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] transition-colors",
            "checked:border-[color:var(--primary)] checked:bg-[color:var(--primary)]",
            "focus-visible:shadow-[var(--shadow-focus)] outline-none",
            className,
          )}
        />
        <svg
          aria-hidden
          className="pointer-events-none absolute h-3 w-3 text-[color:var(--primary-foreground)] opacity-0 peer-checked:opacity-100"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {(label || description) ? (
        <span className="min-w-0">
          {label ? <span className="block text-sm font-medium text-[color:var(--text)]">{label}</span> : null}
          {description ? (
            <span className="mt-0.5 block text-xs text-[color:var(--muted)]">{description}</span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}
