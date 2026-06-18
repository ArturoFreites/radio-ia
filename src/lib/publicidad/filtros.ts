import type { Prisma } from "@prisma/client";

export const wherePublicidadAlAire = (radioId: string): Prisma.AnuncianteWhereInput => ({
  radioId,
  esActivo: true,
  OR: [{ texto: { not: null } }, { audioUrl: { not: null } }],
});

export function publicidadTieneContenido(texto: string | null | undefined, audioUrl: string | null | undefined): boolean {
  return Boolean(texto?.trim()) || Boolean(audioUrl);
}
