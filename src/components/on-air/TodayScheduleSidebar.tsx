import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export type TodayScheduleItem = {
  id: string;
  hora: string;
  nombre: string;
  estado: BadgeVariant;
  estadoLabel: string;
  isActive?: boolean;
  isNext?: boolean;
  isPast?: boolean;
};

export type TodayScheduleSidebarProps = {
  items: TodayScheduleItem[];
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
};

export function TodayScheduleSidebar({
  items,
  collapsed = false,
  className,
}: TodayScheduleSidebarProps): React.ReactElement {
  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--muted)]">
        Grilla de hoy
      </h2>
      {collapsed ? (
        <p className="text-xs text-[color:var(--muted)]">Tocá el ícono para expandir en mobile.</p>
      ) : null}
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "rounded-xl border px-3 py-2.5",
              item.isActive
                ? "border-[color:var(--danger)]/40 bg-[color:var(--danger)]/5"
                : item.isNext
                  ? "border-[color:var(--warning)]/50"
                  : "border-[color:var(--border)] bg-[color:var(--surface-soft)]",
              item.isPast ? "opacity-45" : undefined,
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs tabular-nums text-[color:var(--muted)]">{item.hora}</span>
              <Badge label={item.estadoLabel} variant={item.estado} />
            </div>
            <p className="mt-1 text-sm font-medium text-[color:var(--text)]">{item.nombre}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
