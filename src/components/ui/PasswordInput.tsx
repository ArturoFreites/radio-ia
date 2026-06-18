"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  error?: string;
};

export function PasswordInput({
  label,
  error,
  className,
  id,
  ...props
}: PasswordInputProps): React.ReactElement {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? props.name;

  return (
    <div className="w-full">
      {label ? (
        <label className="mb-1.5 block text-xs font-medium text-[color:var(--muted)]" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          {...props}
          id={inputId}
          type={visible ? "text" : "password"}
          className={cn(
            "w-full rounded-xl border bg-[color:var(--surface)] px-4 py-3 pr-11 text-sm text-[color:var(--text)] placeholder:text-[color:var(--muted)]/70 outline-none transition-[border-color,box-shadow] duration-[var(--t-fast)]",
            "border-[color:var(--border)] focus:border-[color:var(--primary)] focus:shadow-[var(--shadow-focus)]",
            error ? "border-[color:var(--danger)] focus:border-[color:var(--danger)]" : undefined,
            className,
          )}
        />
        <button
          type="button"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)] transition hover:text-[color:var(--text)]"
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <p className="mt-1.5 text-xs text-[color:var(--danger)]">{error}</p> : null}
    </div>
  );
}
