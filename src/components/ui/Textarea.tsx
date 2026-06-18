import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helperText?: string;
  error?: string;
};

export function Textarea({ label, helperText, error, className, id, ...props }: TextareaProps): React.ReactElement {
  const textareaId = id ?? props.name;
  return (
    <div className="w-full">
      {label ? (
        <label className="mb-1.5 block text-xs font-medium text-[color:var(--muted)]" htmlFor={textareaId}>
          {label}
        </label>
      ) : null}
      <textarea
        {...props}
        id={textareaId}
        className={cn(
          "w-full rounded-xl border bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)] placeholder:text-[color:var(--muted)]/70 outline-none transition-[border-color,box-shadow] duration-[var(--t-fast)]",
          "border-[color:var(--border)] focus:border-[color:var(--primary)] focus:shadow-[var(--shadow-focus)]",
          error ? "border-[color:var(--danger)]" : undefined,
          className,
        )}
      />
      {error ? <p className="mt-1.5 text-xs text-[color:var(--danger)]">{error}</p> : null}
      {!error && helperText ? (
        <p className="mt-1.5 text-xs text-[color:var(--muted)]">{helperText}</p>
      ) : null}
    </div>
  );
}
