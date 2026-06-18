import { Copy, Pencil, Trash2 } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export type SlotCardProps = {
  playlist: string;
  horario: string;
  voz?: string;
  duracion?: string;
  interrupciones?: number;
  estado: BadgeVariant;
  estadoLabel: string;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  className?: string;
};

export function SlotCard({
  playlist,
  horario,
  voz,
  duracion,
  interrupciones,
  estado,
  estadoLabel,
  onEdit,
  onDuplicate,
  onDelete,
  className,
}: SlotCardProps): React.ReactElement {
  return (
    <Card variant="base" className={cn("space-y-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-[color:var(--text)]">{playlist}</h3>
          <p className="mt-1 font-mono text-sm tabular-nums text-[color:var(--muted)]">{horario}</p>
        </div>
        <Badge label={estadoLabel} variant={estado} />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        {voz ? (
          <div>
            <dt className="text-[color:var(--muted)]">Voz</dt>
            <dd className="font-medium text-[color:var(--text)]">{voz}</dd>
          </div>
        ) : null}
        {duracion ? (
          <div>
            <dt className="text-[color:var(--muted)]">Duración</dt>
            <dd className="font-mono tabular-nums text-[color:var(--text)]">{duracion}</dd>
          </div>
        ) : null}
        {interrupciones !== undefined ? (
          <div>
            <dt className="text-[color:var(--muted)]">Interrupciones</dt>
            <dd className="font-mono tabular-nums text-[color:var(--text)]">{interrupciones}</dd>
          </div>
        ) : null}
      </dl>

      <div className="flex flex-wrap gap-2">
        {onEdit ? (
          <Button variant="secondary" size="sm" iconLeft={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit}>
            Editar
          </Button>
        ) : null}
        {onDuplicate ? (
          <Button variant="ghost" size="sm" iconLeft={<Copy className="h-3.5 w-3.5" />} onClick={onDuplicate}>
            Duplicar
          </Button>
        ) : null}
        {onDelete ? (
          <Button variant="danger" size="sm" iconLeft={<Trash2 className="h-3.5 w-3.5" />} onClick={onDelete}>
            Eliminar
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
