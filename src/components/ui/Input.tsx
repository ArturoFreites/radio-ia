import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type InputType = "text" | "email" | "password" | "search" | "number" | "time" | "date";

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type?: InputType;
  label?: string;
  helperText?: string;
  error?: string;
};

export function Input({
  label,
  helperText,
  error,
  className,
  id,
  type = "text",
  ...props
}: InputProps): React.ReactElement {
  const inputId = id ?? props.name;
  const isSearch = type === "search";

  return (
    <div className="w-full">
      {label ? (
        <label className="mb-1.5 block text-xs font-medium text-[color:var(--muted)]" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        {isSearch ? (
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted)]"
          />
        ) : null}
        <input
          {...props}
          id={inputId}
          type={type}
          className={cn(
            "w-full rounded-xl border bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)] placeholder:text-[color:var(--muted)]/70 outline-none transition-[border-color,box-shadow] duration-[var(--t-fast)]",
            "border-[color:var(--border)] focus:border-[color:var(--primary)] focus:shadow-[var(--shadow-focus)]",
            error ? "border-[color:var(--danger)] focus:border-[color:var(--danger)]" : undefined,
            isSearch ? "pl-10" : undefined,
            className,
          )}
        />
      </div>
      {error ? <p className="mt-1.5 text-xs text-[color:var(--danger)]">{error}</p> : null}
      {!error && helperText ? (
        <p className="mt-1.5 text-xs text-[color:var(--muted)]">{helperText}</p>
      ) : null}
    </div>
  );
}
