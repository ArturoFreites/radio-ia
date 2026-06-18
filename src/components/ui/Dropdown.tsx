"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type DropdownOption = {
  value: string;
  label: string;
  description?: string;
};

export type DropdownProps = {
  label?: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
};

export function Dropdown({
  label,
  value,
  options,
  onChange,
  placeholder = "Seleccionar…",
  error,
  helperText,
  className,
  disabled = false,
}: DropdownProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const onPointer = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  const useSheet = options.length > 6;

  const list = (
    <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <li key={option.value}>
            <button
              type="button"
              role="option"
              aria-selected={active}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[color:var(--surface-soft)]",
                active ? "text-[color:var(--primary)]" : "text-[color:var(--text)]",
              )}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                setSheetOpen(false);
              }}
            >
              <span className="flex-1">
                <span className="block font-medium">{option.label}</span>
                {option.description ? (
                  <span className="mt-0.5 block text-xs text-[color:var(--muted)]">{option.description}</span>
                ) : null}
              </span>
              {active ? <Check className="h-4 w-4 shrink-0 text-[color:var(--primary)]" aria-hidden /> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className={cn("w-full relative", className)} ref={rootRef}>
      {label ? <p className="mb-1.5 text-xs font-medium text-[color:var(--muted)]">{label}</p> : null}
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl border bg-[color:var(--surface)] px-4 py-3 text-sm transition-[border-color,box-shadow] duration-[var(--t-fast)]",
          "border-[color:var(--border)] focus:border-[color:var(--primary)] focus:shadow-[var(--shadow-focus)] outline-none",
          error ? "border-[color:var(--danger)]" : undefined,
          disabled ? "opacity-40 cursor-not-allowed" : undefined,
        )}
        onClick={() => {
          if (useSheet) {
            setSheetOpen(true);
          } else {
            setOpen((prev) => !prev);
          }
        }}
      >
        <span className={selected ? "text-[color:var(--text)]" : "text-[color:var(--muted)]"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--muted)]" aria-hidden />
      </button>

      {open && !useSheet ? (
        <div className="absolute z-50 mt-2 w-full min-w-[12rem] overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] shadow-[var(--shadow-dropdown)]">
          {list}
        </div>
      ) : null}

      {sheetOpen && useSheet ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/60"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-hidden rounded-t-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] shadow-[var(--shadow-dropdown)]">
            <div className="border-b border-[color:var(--border)] px-4 py-3">
              <p className="text-sm font-semibold text-[color:var(--text)]">{label ?? placeholder}</p>
            </div>
            {list}
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-1.5 text-xs text-[color:var(--danger)]">{error}</p> : null}
      {!error && helperText ? (
        <p className="mt-1.5 text-xs text-[color:var(--muted)]">{helperText}</p>
      ) : null}
    </div>
  );
}
