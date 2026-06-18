import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export type IntegracionesBarProps = {
  spotifyConectado: boolean;
  elevenlabsPorcentaje?: number | null;
  geminiCostoHoy?: string | null;
};

export function IntegracionesBar({
  spotifyConectado,
  elevenlabsPorcentaje,
  geminiCostoHoy,
}: IntegracionesBarProps): React.ReactElement {
  return (
    <Card className="p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
        Integraciones
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3 transition hover:border-[color:var(--primary)]/40 hover:bg-[color:var(--surface-2)]"
          href="/spotify"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--surface-2)]">
              <BrandLogo brand="spotify" size="lg" />
            </div>
            <div>
              <p className="text-sm font-medium text-[color:var(--text)]">Spotify</p>
              <p className="text-xs text-[color:var(--muted)]">
                {spotifyConectado ? "Conectado · Premium" : "Sin conectar"}
              </p>
            </div>
          </div>
          <Badge
            label={spotifyConectado ? "Activo" : "Pendiente"}
            variant={spotifyConectado ? "online" : "offline"}
          />
        </Link>

        <Link
          className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3 transition hover:border-[color:var(--primary)]/40 hover:bg-[color:var(--surface-2)]"
          href="/dashboard#consumo-apis"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-white px-1.5">
              <BrandLogo brand="elevenlabs" size="lg" />
            </div>
            <div>
              <p className="text-sm font-medium text-[color:var(--text)]">ElevenLabs</p>
              <p className="text-xs text-[color:var(--muted)]">
                {elevenlabsPorcentaje !== null && elevenlabsPorcentaje !== undefined
                  ? `${elevenlabsPorcentaje}% de cuota`
                  : "Ver detalles"}
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-[color:var(--primary)]">Ver detalles</span>
        </Link>

        <Link
          className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3 transition hover:border-[color:var(--primary)]/40 hover:bg-[color:var(--surface-2)]"
          href="/dashboard#consumo-apis"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--surface-2)]">
              <BrandLogo brand="gemini" size="lg" />
            </div>
            <div>
              <p className="text-sm font-medium text-[color:var(--text)]">Gemini API</p>
              <p className="text-xs text-[color:var(--muted)]">
                {geminiCostoHoy ? `${geminiCostoHoy} hoy` : "Costo estimado"}
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-[color:var(--primary)]">Ver detalles</span>
        </Link>
      </div>
    </Card>
  );
}
