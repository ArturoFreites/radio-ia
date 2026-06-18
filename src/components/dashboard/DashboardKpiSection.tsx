"use client";

import { useEffect, useState } from "react";
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard";
import { isoHoraInicioArgentina } from "@/lib/grilla/tiempo";

export type DashboardKpiSectionProps = {
  slotsHoy: number;
  slotsHint?: string;
  slotsCompletados: number;
  slotActivoInicio?: string | null;
  slotActivoFin?: string | null;
  geminiCostoMes: string;
  geminiHint?: string;
  almacenamientoTexto: string;
  almacenamientoPorcentaje: number;
};

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function TiempoAlAireKpi({
  horaInicio,
  horaFin,
}: {
  horaInicio: string;
  horaFin: string;
}): React.ReactElement {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    const tick = (): void => {
      const now = Date.now();
      const inicioMs = new Date(isoHoraInicioArgentina(new Date(now), horaInicio)).getTime();
      setElapsed(formatElapsed(now - inicioMs));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [horaInicio, horaFin]);

  return (
    <DashboardKpiCard hint="En vivo" label="Tiempo al aire" tone="blue" value={elapsed} />
  );
}

export function DashboardKpiSection({
  slotsHoy,
  slotsHint,
  slotsCompletados,
  slotActivoInicio,
  slotActivoFin,
  geminiCostoMes,
  geminiHint,
  almacenamientoTexto,
  almacenamientoPorcentaje,
}: DashboardKpiSectionProps): React.ReactElement {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <DashboardKpiCard
        hint={slotsHint ?? "Programación del día"}
        label="Slots hoy"
        tone="lime"
        value={String(slotsHoy)}
      />
      <DashboardKpiCard
        hint="Segmentos finalizados"
        label="Completados"
        tone="yellow"
        value={String(slotsCompletados)}
      />
      {slotActivoInicio && slotActivoFin ? (
        <TiempoAlAireKpi horaFin={slotActivoFin} horaInicio={slotActivoInicio} />
      ) : (
        <DashboardKpiCard hint="Sin transmisión" label="Tiempo al aire" tone="blue" value="00:00:00" />
      )}
      <DashboardKpiCard
        hint={geminiHint ?? "Costo estimado del mes"}
        href="#consumo-apis"
        label="Gemini API"
        tone="purple"
        value={geminiCostoMes}
      />
      <DashboardKpiCard
        href="/almacenamiento"
        label="Almacenamiento"
        progress={almacenamientoPorcentaje}
        progressLabel={almacenamientoTexto}
        value={almacenamientoTexto.split(" / ")[0] ?? almacenamientoTexto}
      />
    </section>
  );
}
