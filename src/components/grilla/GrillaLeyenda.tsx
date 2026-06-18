import { SLOT_COLOR_CLASSES, type SlotColorVariant } from "@/lib/grilla/slotColores";
import { cn } from "@/lib/utils";

const ORDEN: SlotColorVariant[] = ["dj", "presentacion", "musical", "evento", "interrupciones"];

export type GrillaLeyendaProps = {
  className?: string;
};

export function GrillaLeyenda({ className }: GrillaLeyendaProps): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[color:var(--border)] pt-3 text-xs text-[color:var(--muted)]",
        className,
      )}
    >
      {ORDEN.map((variant) => (
        <span key={variant} className="inline-flex items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", SLOT_COLOR_CLASSES[variant].dot)} aria-hidden />
          {SLOT_COLOR_CLASSES[variant].label}
        </span>
      ))}
    </div>
  );
}
