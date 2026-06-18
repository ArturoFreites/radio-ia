import { cn } from "@/lib/utils";

export type RadioProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  description?: string;
};

export function Radio({
  label,
  description,
  className,
  id,
  ...props
}: RadioProps): React.ReactElement {
  const inputId = id ?? `${props.name}-${props.value}`;

  return (
    <label
      htmlFor={inputId}
      className={cn("flex cursor-pointer items-start gap-3", props.disabled ? "opacity-40 cursor-not-allowed" : undefined)}
    >
      <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          {...props}
          id={inputId}
          type="radio"
          className={cn(
            "peer h-5 w-5 appearance-none rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] transition-colors",
            "checked:border-[color:var(--primary)]",
            "focus-visible:shadow-[var(--shadow-focus)] outline-none",
            className,
          )}
        />
        <span className="pointer-events-none absolute h-2.5 w-2.5 rounded-full bg-[color:var(--primary)] opacity-0 peer-checked:opacity-100" />
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
