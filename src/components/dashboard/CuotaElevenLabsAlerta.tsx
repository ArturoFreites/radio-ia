"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import type { ElevenLabsQuota } from "@/lib/elevenlabs/quota";

export type CuotaElevenLabsAlertaProps = {
  umbralAlerta: number;
};

export function CuotaElevenLabsAlerta({
  umbralAlerta,
}: CuotaElevenLabsAlertaProps): React.ReactElement | null {
  const [quota, setQuota] = useState<ElevenLabsQuota | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchQuota(): Promise<void> {
      try {
        const res = await fetch("/api/elevenlabs/quota");
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as ElevenLabsQuota;
        if (!cancelled) {
          setQuota(data);
        }
      } catch {
        // Sin banner si la consulta falla — no bloquear el dashboard
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    void fetchQuota();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || quota === null) {
    return null;
  }

  if (quota.creditosRestantes >= umbralAlerta) {
    return null;
  }

  if (quota.creditosRestantes === 0) {
    return (
      <div
        className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-3 text-red-100"
        role="alert"
      >
        <BrandLogo brand="elevenlabs" className="mt-0.5 rounded bg-white px-1" padded size="sm" />
        <div>
          <p className="font-medium text-red-200">Créditos ElevenLabs agotados</p>
          <p className="mt-1 text-sm text-red-300/90">
            No quedan créditos de voz ({quota.porcentajeUsado}% usado de{" "}
            {quota.creditosTotal.toLocaleString("es-AR")}). Los programas pueden salir al aire sin
            audio hasta recargar la cuenta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-amber-100"
      role="alert"
    >
      <BrandLogo brand="elevenlabs" className="mt-0.5 rounded bg-white px-1" padded size="sm" />
      <div>
        <p className="font-medium text-amber-200">Créditos ElevenLabs bajos</p>
        <p className="mt-1 text-sm text-amber-300/90">
          Quedan{" "}
          <span className="font-semibold tabular-nums">
            {quota.creditosRestantes.toLocaleString("es-AR")}
          </span>{" "}
          créditos de voz ({quota.porcentajeUsado}% usado). Recargá la cuenta antes de que se agoten.
        </p>
      </div>
    </div>
  );
}
