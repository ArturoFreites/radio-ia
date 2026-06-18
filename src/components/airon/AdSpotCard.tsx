import { Pencil, Power, Sparkles, Volume2 } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export type AdSpotCardProps = {
  producto: string;
  oferta?: string;
  estilo?: string;
  guion?: string;
  estado: BadgeVariant;
  estadoLabel: string;
  activa?: boolean;
  onGenerarGuion?: () => void;
  onGenerarAudio?: () => void;
  onToggleActiva?: () => void;
  onEdit?: () => void;
  onPreview?: () => void;
  className?: string;
};

export function AdSpotCard({
  producto,
  oferta,
  estilo,
  guion,
  estado,
  estadoLabel,
  activa = true,
  onGenerarGuion,
  onGenerarAudio,
  onToggleActiva,
  onEdit,
  onPreview,
  className,
}: AdSpotCardProps): React.ReactElement {
  return (
    <Card variant="base" className={cn("space-y-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--text)]">{producto}</h3>
          {oferta ? <p className="mt-1 text-sm text-[color:var(--primary)]">{oferta}</p> : null}
          {estilo ? <p className="mt-1 text-xs text-[color:var(--muted)]">{estilo}</p> : null}
        </div>
        <Badge label={estadoLabel} variant={estado} />
      </div>

      {guion ? (
        <p className="rounded-xl bg-[color:var(--surface-soft)] p-3 text-sm text-[color:var(--muted)] line-clamp-4">
          {guion}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {onPreview ? (
          <Button variant="secondary" size="sm" iconLeft={<Volume2 className="h-3.5 w-3.5" />} onClick={onPreview}>
            Preview
          </Button>
        ) : null}
        {onGenerarGuion ? (
          <Button variant="ghost" size="sm" iconLeft={<Sparkles className="h-3.5 w-3.5" />} onClick={onGenerarGuion}>
            Generar guion
          </Button>
        ) : null}
        {onGenerarAudio ? (
          <Button variant="primary" size="sm" onClick={onGenerarAudio}>
            Generar audio
          </Button>
        ) : null}
        {onToggleActiva ? (
          <Button
            variant={activa ? "danger" : "secondary"}
            size="sm"
            iconLeft={<Power className="h-3.5 w-3.5" />}
            onClick={onToggleActiva}
          >
            {activa ? "Desactivar" : "Activar"}
          </Button>
        ) : null}
        {onEdit ? (
          <Button variant="ghost" size="sm" iconLeft={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit}>
            Editar
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
