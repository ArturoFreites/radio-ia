import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  helperText?: string;
  error?: string;
};

export function Select({
  label,
  helperText,
  error,
  className,
  id,
  children,
  ...props
}: SelectProps): React.ReactElement {
  const selectId = id ?? props.name;

  return (
    <div className="w-full">
      {label ? (
        <label className="mb-1.5 block text-xs font-medium text-[color:var(--muted)]" htmlFor={selectId}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          {...props}
          id={selectId}
          className={cn(
            "w-full appearance-none rounded-xl border bg-[color:var(--surface)] px-4 py-3 pr-11 text-sm text-[color:var(--text)] outline-none transition-[border-color,box-shadow] duration-[var(--t-fast)]",
            "border-[color:var(--border)] focus:border-[color:var(--primary)] focus:shadow-[var(--shadow-focus)]",
            error ? "border-[color:var(--danger)]" : undefined,
            className,
          )}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted)]"
        />
      </div>
      {error ? <p className="mt-1.5 text-xs text-[color:var(--danger)]">{error}</p> : null}
      {!error && helperText ? (
        <p className="mt-1.5 text-xs text-[color:var(--muted)]">{helperText}</p>
      ) : null}
    </div>
  );
}
