import { getPartesArgentina } from "@/lib/grilla/tiempo";
import type { PeriodoConsumo } from "@/types/consumo";

const MESES_ES: Record<number, string> = {
  1: "enero",
  2: "febrero",
  3: "marzo",
  4: "abril",
  5: "mayo",
  6: "junio",
  7: "julio",
  8: "agosto",
  9: "septiembre",
  10: "octubre",
  11: "noviembre",
  12: "diciembre",
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoArgentina(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): string {
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}-03:00`;
}

function diasEnMes(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function inicioSemanaLunes(partes: ReturnType<typeof getPartesArgentina>): { year: number; month: number; day: number } {
  const diasDesdeLunes = (partes.weekday0Sun + 6) % 7;
  const baseUtc = Date.UTC(partes.year, partes.month - 1, partes.day - diasDesdeLunes, 12, 0, 0);
  const inicio = getPartesArgentina(new Date(baseUtc));
  return { year: inicio.year, month: inicio.month, day: inicio.day };
}

export type RangoPeriodoConsumo = {
  tipo: PeriodoConsumo;
  desde: Date;
  hastaExclusive: Date;
  desdeIso: string;
  hastaIso: string;
  etiqueta: string;
};

export function rangoPeriodoConsumo(tipo: PeriodoConsumo, referencia = new Date()): RangoPeriodoConsumo {
  const partes = getPartesArgentina(referencia);

  if (tipo === "mes") {
    const desdeIso = isoArgentina(partes.year, partes.month, 1);
    const ultimoDia = diasEnMes(partes.year, partes.month);
    const hastaIso = isoArgentina(partes.year, partes.month, ultimoDia, 23, 59, 59);
    const mesSiguiente = partes.month === 12 ? { year: partes.year + 1, month: 1 } : { year: partes.year, month: partes.month + 1 };
    const hastaExclusiveIso = isoArgentina(mesSiguiente.year, mesSiguiente.month, 1);

    return {
      tipo,
      desde: new Date(desdeIso),
      hastaExclusive: new Date(hastaExclusiveIso),
      desdeIso,
      hastaIso,
      etiqueta: `${MESES_ES[partes.month] ?? "mes"} ${partes.year}`,
    };
  }

  const inicio = inicioSemanaLunes(partes);
  const desdeIso = isoArgentina(inicio.year, inicio.month, inicio.day);
  const finUtc = Date.UTC(inicio.year, inicio.month - 1, inicio.day + 6, 12, 0, 0);
  const fin = getPartesArgentina(new Date(finUtc));
  const hastaIso = isoArgentina(fin.year, fin.month, fin.day, 23, 59, 59);
  const hastaExclusiveIso = isoArgentina(inicio.year, inicio.month, inicio.day + 7);

  return {
    tipo,
    desde: new Date(desdeIso),
    hastaExclusive: new Date(hastaExclusiveIso),
    desdeIso,
    hastaIso,
    etiqueta: `Semana ${pad(inicio.day)}/${pad(inicio.month)} – ${pad(fin.day)}/${pad(fin.month)}`,
  };
}
