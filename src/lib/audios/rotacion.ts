import type { ModoRotacionAudio } from "@prisma/client";

export type AudioRotacionItem = {
  id: string;
  nombre: string;
  duracionSec: number | null;
};

/**
 * Elige el próximo índice. En ALEATORIO evita repetir el mismo si hay ≥2.
 * `ultimoId` es el archivo que acaba de sonar (o null al inicio).
 */
export function elegirSiguienteIndiceAudio(
  items: AudioRotacionItem[],
  modo: ModoRotacionAudio,
  indiceActual: number,
  ultimoId: string | null,
): number {
  const total = items.length;
  if (total <= 0) return 0;
  if (total === 1) return 0;

  if (modo === "SECUENCIAL") {
    return (indiceActual + 1) % total;
  }

  const candidatos = items
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.id !== ultimoId);
  const pool = candidatos.length > 0 ? candidatos : items.map((item, idx) => ({ item, idx }));
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick?.idx ?? 0;
}

export function siguienteIndiceSecuencial(actual: number, total: number): number {
  if (total <= 0) return 0;
  return (actual + 1) % total;
}
