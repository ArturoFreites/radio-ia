import { ProveedorConsumo } from "@prisma/client";
import { formatearBytes } from "@/lib/audio/storageGestion";
import { formatearUsd } from "@/lib/consumo/constants";
import { getPartesArgentina } from "@/lib/grilla/tiempo";
import { prisma } from "@/lib/prisma";

const STORAGE_LIMITE_BYTES = 10 * 1024 * 1024 * 1024;

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

function isoHoyArgentina(referencia = new Date()): string {
  const p = getPartesArgentina(referencia);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T00:00:00-03:00`;
}

function isoMananaArgentina(referencia = new Date()): string {
  const p = getPartesArgentina(referencia);
  const utc = Date.UTC(p.year, p.month - 1, p.day + 1, 12, 0, 0);
  const m = getPartesArgentina(new Date(utc));
  return `${m.year}-${pad(m.month)}-${pad(m.day)}T00:00:00-03:00`;
}

export function etiquetaFechaHoy(referencia = new Date()): string {
  const p = getPartesArgentina(referencia);
  return `${p.day} de ${MESES_ES[p.month] ?? "mes"}`;
}

export function diasHastaFinDeMes(referencia = new Date()): number {
  const p = getPartesArgentina(referencia);
  const ultimoDia = new Date(Date.UTC(p.year, p.month, 0)).getUTCDate();
  return Math.max(0, ultimoDia - p.day);
}

export function formatearAlmacenamientoConLimite(totalBytes: number): {
  texto: string;
  porcentaje: number;
} {
  const pct = Math.min(100, Math.round((totalBytes / STORAGE_LIMITE_BYTES) * 100));
  return {
    texto: `${formatearBytes(totalBytes)} / 10 GB`,
    porcentaje: pct,
  };
}

export async function obtenerCostoGeminiHoy(radioId: string, referencia = new Date()): Promise<string> {
  const desde = new Date(isoHoyArgentina(referencia));
  const hasta = new Date(isoMananaArgentina(referencia));

  const registros = await prisma.consumoApiRegistro.findMany({
    where: {
      radioId,
      proveedor: ProveedorConsumo.GEMINI,
      createdAt: { gte: desde, lt: hasta },
    },
    select: { costoEstimadoUsd: true },
  });

  const total = registros.reduce((sum, r) => sum + r.costoEstimadoUsd, 0);
  return formatearUsd(total);
}

export function nombreLocutorSlot(voz1Nombre?: string, voz2Nombre?: string): string | null {
  if (voz1Nombre && voz2Nombre) {
    return `${voz1Nombre} y ${voz2Nombre}`;
  }
  return voz1Nombre ?? voz2Nombre ?? null;
}
