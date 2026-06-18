"use client";

import { useCallback, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Card } from "@/components/ui/Card";
import { formatearTokens, formatearUsd, GEMINI_TEXT_MODEL_LABEL } from "@/lib/consumo/constants";
import { cn } from "@/lib/utils";
import type { PeriodoConsumo, ResumenConsumoApis } from "@/types/consumo";

type ConsumoApisPanelProps = {
  periodoInicial?: PeriodoConsumo;
};

function ProgressBar({
  value,
  className,
  warning,
}: {
  value: number;
  className?: string;
  warning?: boolean;
}): React.ReactElement {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          warning
            ? "bg-gradient-to-r from-[color:var(--warning)] to-[color:var(--danger)]"
            : "bg-[color:var(--primary)]",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ConsumoApisPanel({ periodoInicial = "mes" }: ConsumoApisPanelProps): React.ReactElement {
  const [periodo, setPeriodo] = useState<PeriodoConsumo>(periodoInicial);
  const [resumen, setResumen] = useState<ResumenConsumoApis | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (tipo: PeriodoConsumo): Promise<void> => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/consumo/resumen?periodo=${tipo}`, { cache: "no-store" });
      if (!res.ok) {
        setError("No se pudo cargar el consumo");
        setResumen(null);
        return;
      }
      const data = (await res.json()) as ResumenConsumoApis;
      setResumen(data);
    } catch {
      setError("No se pudo cargar el consumo");
      setResumen(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar(periodo);
  }, [periodo, cargar]);

  const gemini = resumen?.gemini;
  const eleven = resumen?.elevenlabs;
  const suscripcion = eleven?.suscripcion;

  const cuotaAlta = (suscripcion?.porcentajeUsado ?? 0) >= 75;

  return (
    <section className="space-y-3" id="consumo-apis">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--muted)]">
            Consumo de APIs
          </h2>
          {resumen ? (
            <p className="mt-0.5 text-xs text-zinc-500">
              {resumen.periodo.etiqueta} · costos estimados
            </p>
          ) : null}
        </div>
        <div className="inline-flex rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-0.5">
          {(["semana", "mes"] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                periodo === tipo
                  ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
                  : "text-[color:var(--muted)] hover:text-[color:var(--text)]",
              )}
              onClick={() => setPeriodo(tipo)}
            >
              {tipo === "semana" ? "Semanal" : "Mensual"}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-[color:var(--danger)]">{error}</p>
      ) : null}

      {cuotaAlta && suscripcion ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-4 py-3"
          role="alert"
        >
          <p className="text-sm text-[color:var(--warning)]">
            Estás por superar el límite de ElevenLabs ({Math.round(suscripcion.porcentajeUsado)}% usado).
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Google Gemini</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                {cargando ? "…" : formatearUsd(gemini?.costoEstimadoUsd ?? 0)}
              </p>
              <p className="text-xs text-zinc-500">costo estimado</p>
            </div>
            <BrandLogo brand="gemini" size="md" />
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-zinc-500">Tokens entrada</dt>
              <dd className="font-mono font-medium tabular-nums">
                {cargando ? "…" : formatearTokens(gemini?.tokensEntrada ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Tokens salida</dt>
              <dd className="font-mono font-medium tabular-nums">
                {cargando ? "…" : formatearTokens(gemini?.tokensSalida ?? 0)}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-zinc-500">
            {cargando ? "…" : `${gemini?.llamadas ?? 0} llamadas · ${GEMINI_TEXT_MODEL_LABEL} · $0.30/$2.50 por 1M tokens`}
          </p>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">ElevenLabs</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                {cargando ? "…" : formatearUsd(eleven?.costoEstimadoUsd ?? 0)}
              </p>
              <p className="text-xs text-zinc-500">costo estimado del periodo</p>
            </div>
            <BrandLogo brand="elevenlabs" padded size="md" />
          </div>

          {suscripcion ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Cuota mensual (cuenta)</span>
                <span className="font-mono tabular-nums">
                  {suscripcion.creditosUsados.toLocaleString("es-AR")} /{" "}
                  {suscripcion.creditosTotal.toLocaleString("es-AR")}
                </span>
              </div>
              <ProgressBar value={suscripcion.porcentajeUsado} warning={cuotaAlta} />
              <p className="text-xs text-zinc-500">
                {suscripcion.creditosRestantes.toLocaleString("es-AR")} créditos restantes en la suscripción
              </p>
            </div>
          ) : (
            <p className="text-xs text-amber-400/90">Suscripción no disponible — solo datos registrados localmente</p>
          )}

          <dl className="text-sm">
            <dt className="text-zinc-500">Caracteres generados (esta radio)</dt>
            <dd className="font-mono font-medium tabular-nums">
              {cargando ? "…" : (eleven?.caracteresRegistrados ?? 0).toLocaleString("es-AR")}
            </dd>
          </dl>
          <p className="text-xs text-zinc-500">
            {cargando
              ? "…"
              : `${eleven?.llamadas ?? 0} síntesis · prod: eleven_turbo_v2_5 ($0.05/1K) · preview: eleven_multilingual_v2 ($0.10/1K)`}
          </p>
        </Card>
      </div>
    </section>
  );
}
