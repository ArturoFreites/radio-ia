import { z } from "zod";

const intervaloMinZ = z.number().int().min(5).max(1440);

export const DJ_INTERRUPCION_INTERVALO_MIN = 5;
export const DJ_INTERRUPCION_INTERVALO_MAX = 1440;

export function clampDjIntervaloMin(value: number): number {
  if (!Number.isFinite(value)) return DJ_INTERRUPCION_INTERVALO_MIN;
  return Math.min(
    DJ_INTERRUPCION_INTERVALO_MAX,
    Math.max(DJ_INTERRUPCION_INTERVALO_MIN, Math.round(value)),
  );
}

export const djInterrupcionesFieldsZ = z
  .object({
    presentacionCadaTemas: z.number().int().min(1).max(20).optional(),
    djHoraActiva: z.boolean().optional(),
    djHoraIntervaloMin: intervaloMinZ.nullable().optional(),
    djClimaActivo: z.boolean().optional(),
    djClimaIntervaloMin: intervaloMinZ.nullable().optional(),
    djPublicidadActiva: z.boolean().optional(),
    djPublicidadIntervaloMin: intervaloMinZ.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.djHoraActiva && (data.djHoraIntervaloMin === null || data.djHoraIntervaloMin === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "djHoraIntervaloMin requerido cuando djHoraActiva es true",
        path: ["djHoraIntervaloMin"],
      });
    }
    if (data.djClimaActivo && (data.djClimaIntervaloMin === null || data.djClimaIntervaloMin === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "djClimaIntervaloMin requerido cuando djClimaActivo es true",
        path: ["djClimaIntervaloMin"],
      });
    }
    if (
      data.djPublicidadActiva &&
      (data.djPublicidadIntervaloMin === null || data.djPublicidadIntervaloMin === undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "djPublicidadIntervaloMin requerido cuando djPublicidadActiva es true",
        path: ["djPublicidadIntervaloMin"],
      });
    }
  });

export type DjInterrupcionesFields = z.infer<typeof djInterrupcionesFieldsZ>;

export type DjInterrupcionesConfig = {
  presentacionCadaTemas: number;
  djHoraActiva: boolean;
  djHoraIntervaloMin: number | null;
  djClimaActivo: boolean;
  djClimaIntervaloMin: number | null;
  djPublicidadActiva: boolean;
  djPublicidadIntervaloMin: number | null;
};

export function djConfigFromRow(row: {
  presentacionCadaTemas: number;
  djHoraActiva: boolean;
  djHoraIntervaloMin: number | null;
  djClimaActivo: boolean;
  djClimaIntervaloMin: number | null;
  djPublicidadActiva: boolean;
  djPublicidadIntervaloMin: number | null;
}): DjInterrupcionesConfig {
  return {
    presentacionCadaTemas: row.presentacionCadaTemas,
    djHoraActiva: row.djHoraActiva,
    djHoraIntervaloMin: row.djHoraIntervaloMin,
    djClimaActivo: row.djClimaActivo,
    djClimaIntervaloMin: row.djClimaIntervaloMin,
    djPublicidadActiva: row.djPublicidadActiva,
    djPublicidadIntervaloMin: row.djPublicidadIntervaloMin,
  };
}

/** Firma estable para evitar reiniciar timers cuando el objeto config cambia de referencia. */
export function djConfigSignature(config: DjInterrupcionesConfig): string {
  return JSON.stringify({
    p: config.presentacionCadaTemas,
    ha: config.djHoraActiva,
    hi: config.djHoraIntervaloMin,
    ca: config.djClimaActivo,
    ci: config.djClimaIntervaloMin,
    pa: config.djPublicidadActiva,
    pi: config.djPublicidadIntervaloMin,
  });
}
