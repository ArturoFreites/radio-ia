"use client";

import { cn } from "@/lib/utils";

export type SegmentedControlProps<T extends string> = {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: SegmentedControlProps<T>): React.ReactElement {
  return (
    <div
      className={cn(
        "inline-flex w-full rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] p-1",
        className,
      )}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all duration-[var(--t-fast)]",
              active
                ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
                : "text-[color:var(--muted)] hover:text-[color:var(--text)]",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
