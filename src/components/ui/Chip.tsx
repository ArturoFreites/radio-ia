import { cn } from "@/lib/utils";

export type ChipProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

export function Chip({ label, active = false, onClick, className }: ChipProps): React.ReactElement {
  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-[color:var(--primary)] bg-[color:var(--primary)]/15 text-[color:var(--primary)]"
          : "border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--muted)] hover:text-[color:var(--text)]",
        className,
      )}
    >
      {label}
    </Tag>
  );
}
