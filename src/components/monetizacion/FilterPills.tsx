"use client";

import { cn } from "@/lib/utils";

export type FilterPillOption<T extends string> = {
  id: T;
  label: string;
};

export type FilterPillsProps<T extends string> = {
  options: Array<FilterPillOption<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  className,
}: FilterPillsProps<T>): React.ReactElement {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} role="tablist">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              active
                ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
                : "border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--muted)] hover:text-[color:var(--text)]",
            )}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
