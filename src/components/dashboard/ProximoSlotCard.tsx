import { BrandLogo } from "@/components/brand/BrandLogo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export type ProximoSlotCardProps = {
  nombre: string;
  horaInicio: string;
  horaFin: string;
  locutor?: string | null;
  playlistNombre?: string | null;
  spotifyHref?: string | null;
};

export function ProximoSlotCard({
  nombre,
  horaInicio,
  horaFin,
  locutor,
  playlistNombre,
  spotifyHref,
}: ProximoSlotCardProps): React.ReactElement {
  return (
    <Card variant="elevated" className="flex h-full flex-col justify-between p-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
            Próximo slot
          </p>
          <Badge label="Siguiente" variant="pending" showDot={false} />
        </div>

        <div>
          <h3 className="text-xl font-bold text-[color:var(--text)]">{nombre}</h3>
          {locutor ? (
            <p className="mt-1 text-sm text-[color:var(--muted)]">{locutor}</p>
          ) : null}
          <p className="mt-2 font-mono text-sm tabular-nums text-[color:var(--primary)]">
            {horaInicio} – {horaFin}
          </p>
          {playlistNombre ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-[color:var(--muted)]">
              <BrandLogo brand="spotify" size="xs" />
              {playlistNombre}
            </p>
          ) : null}
        </div>
      </div>

      {spotifyHref ? (
        <Button
          className="mt-4 w-full"
          href={spotifyHref}
          icon={<BrandLogo brand="spotify" size="xs" />}
          size="sm"
          variant="secondary"
        >
          Ver playlist
        </Button>
      ) : null}
    </Card>
  );
}
