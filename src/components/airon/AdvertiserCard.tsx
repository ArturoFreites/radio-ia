import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export type AdvertiserCardProps = {
  nombre: string;
  rubro?: string;
  publicidadesActivas?: number;
  montoMensual?: string;
  estadoPago: BadgeVariant;
  estadoLabel: string;
  inactive?: boolean;
  className?: string;
};

export function AdvertiserCard({
  nombre,
  rubro,
  publicidadesActivas,
  montoMensual,
  estadoPago,
  estadoLabel,
  inactive = false,
  className,
}: AdvertiserCardProps): React.ReactElement {
  return (
    <Card
      variant="base"
      className={cn("space-y-4", inactive ? "opacity-60" : undefined, className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--text)]">{nombre}</h3>
          {rubro ? <p className="mt-1 text-sm text-[color:var(--muted)]">{rubro}</p> : null}
        </div>
        <Badge label={estadoLabel} variant={estadoPago} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {publicidadesActivas !== undefined ? (
          <div>
            <dt className="text-[color:var(--muted)]">Publicidades activas</dt>
            <dd className="font-mono tabular-nums text-[color:var(--text)]">{publicidadesActivas}</dd>
          </div>
        ) : null}
        {montoMensual ? (
          <div>
            <dt className="text-[color:var(--muted)]">Monto mensual</dt>
            <dd className="font-mono tabular-nums text-[color:var(--text)]">{montoMensual}</dd>
          </div>
        ) : null}
      </dl>
    </Card>
  );
}
