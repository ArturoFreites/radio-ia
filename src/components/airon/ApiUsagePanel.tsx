"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/utils";

export type ApiUsagePanelProps = {
  periodo: "semana" | "mes";
  onPeriodoChange: (periodo: "semana" | "mes") => void;
  gemini: {
    tokensEntrada: number;
    tokensSalida: number;
    costoEstimadoUsd: number;
    llamadas: number;
  } | null;
  elevenlabs: {
    caracteresRegistrados: number;
    costoEstimadoUsd: number;
    llamadas: number;
    porcentajeCuota?: number;
    creditosUsados?: number;
    creditosTotal?: number;
  } | null;
  cargando?: boolean;
  error?: string | null;
  className?: string;
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return n.toLocaleString("es-AR");
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD" }).format(n);
}

export function ApiUsagePanel({
  periodo,
  onPeriodoChange,
  gemini,
  elevenlabs,
  cargando = false,
  error = null,
  className,
}: ApiUsagePanelProps): React.ReactElement {
  const cuotaPct = elevenlabs?.porcentajeCuota ?? 0;
  const cuotaAlta = cuotaPct >= 80;

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--muted)]">
            Consumo de APIs
          </h2>
          <p className="mt-0.5 text-xs text-[color:var(--muted)]">Costos estimados del periodo</p>
        </div>
        <SegmentedControl
          className="max-w-[220px]"
          value={periodo}
          onChange={onPeriodoChange}
          options={[
            { value: "semana", label: "Semana" },
            { value: "mes", label: "Mes" },
          ]}
        />
      </div>

      {error ? <Alert type="error" title="Error al cargar consumo" description={error} /> : null}
      {cuotaAlta ? (
        <Alert
          type="warning"
          title="Cuota ElevenLabs alta"
          description={`Has usado el ${Math.round(cuotaPct)}% de tu cuota mensual.`}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card variant="stat" className="space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                Google Gemini
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                {cargando ? "…" : formatUsd(gemini?.costoEstimadoUsd ?? 0)}
              </p>
            </div>
            <BrandLogo brand="gemini" size="md" />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[color:var(--muted)]">Tokens entrada</dt>
              <dd className="font-mono font-medium tabular-nums">
                {cargando ? "…" : formatTokens(gemini?.tokensEntrada ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-[color:var(--muted)]">Tokens salida</dt>
              <dd className="font-mono font-medium tabular-nums">
                {cargando ? "…" : formatTokens(gemini?.tokensSalida ?? 0)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card variant="stat" className="space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                ElevenLabs
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                {cargando ? "…" : formatUsd(elevenlabs?.costoEstimadoUsd ?? 0)}
              </p>
            </div>
            <BrandLogo brand="elevenlabs" padded size="md" />
          </div>
          {elevenlabs?.porcentajeCuota !== undefined ? (
            <Progress
              value={elevenlabs.porcentajeCuota}
              label="Cuota mensual"
              barClassName={cuotaAlta ? "bg-[color:var(--warning)]" : undefined}
            />
          ) : null}
          <p className="text-sm text-[color:var(--muted)]">
            {cargando
              ? "…"
              : `${(elevenlabs?.caracteresRegistrados ?? 0).toLocaleString("es-AR")} caracteres · ${elevenlabs?.llamadas ?? 0} síntesis`}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Gemini llamadas" value={cargando ? "…" : (gemini?.llamadas ?? 0)} />
        <StatCard
          label="ElevenLabs chars"
          value={cargando ? "…" : (elevenlabs?.caracteresRegistrados ?? 0).toLocaleString("es-AR")}
        />
        <StatCard
          label="Cuota ElevenLabs"
          value={cargando ? "…" : `${Math.round(cuotaPct)}%`}
          accent={cuotaAlta}
        />
      </div>
    </section>
  );
}
