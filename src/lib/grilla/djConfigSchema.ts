import { z } from "zod";

const intervaloMinZ = z.number().int().min(5).max(1440);

export const DJ_INTERRUPCION_INTERVALO_MIN = 5;
export const DJ_INTERRUPCION_INTERVALO_MAX = 1440;
export const DJ_TEXTO_MAX_CHARS = 120;

export function clampDjIntervaloMin(value: number): number {
  if (!Number.isFinite(value)) return DJ_INTERRUPCION_INTERVALO_MIN;
  return Math.min(
    DJ_INTERRUPCION_INTERVALO_MAX,
    Math.max(DJ_INTERRUPCION_INTERVALO_MIN, Math.round(value)),
  );
}

export function sanitizarDjTextoContenido(raw: string): string {
  return raw.trim().slice(0, DJ_TEXTO_MAX_CHARS);
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
    djAudioActiva: z.boolean().optional(),
    djAudioIntervaloMin: intervaloMinZ.nullable().optional(),
    djAudioCarpetaId: z.string().cuid().nullable().optional(),
    djTextoActiva: z.boolean().optional(),
    djTextoIntervaloMin: intervaloMinZ.nullable().optional(),
    djTextoContenido: z.string().max(DJ_TEXTO_MAX_CHARS).nullable().optional(),
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
    if (data.djAudioActiva) {
      if (data.djAudioIntervaloMin === null || data.djAudioIntervaloMin === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "djAudioIntervaloMin requerido cuando djAudioActiva es true",
          path: ["djAudioIntervaloMin"],
        });
      }
      if (!data.djAudioCarpetaId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "djAudioCarpetaId requerido cuando djAudioActiva es true",
          path: ["djAudioCarpetaId"],
        });
      }
    }
    if (data.djTextoActiva) {
      if (data.djTextoIntervaloMin === null || data.djTextoIntervaloMin === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "djTextoIntervaloMin requerido cuando djTextoActiva es true",
          path: ["djTextoIntervaloMin"],
        });
      }
      const texto = data.djTextoContenido?.trim() ?? "";
      if (!texto) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "djTextoContenido requerido cuando djTextoActiva es true",
          path: ["djTextoContenido"],
        });
      }
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
  djAudioActiva: boolean;
  djAudioIntervaloMin: number | null;
  djAudioCarpetaId: string | null;
  djTextoActiva: boolean;
  djTextoIntervaloMin: number | null;
  djTextoContenido: string | null;
};

export function djConfigFromRow(row: {
  presentacionCadaTemas: number;
  djHoraActiva: boolean;
  djHoraIntervaloMin: number | null;
  djClimaActivo: boolean;
  djClimaIntervaloMin: number | null;
  djPublicidadActiva: boolean;
  djPublicidadIntervaloMin: number | null;
  djAudioActiva: boolean;
  djAudioIntervaloMin: number | null;
  djAudioCarpetaId: string | null;
  djTextoActiva: boolean;
  djTextoIntervaloMin: number | null;
  djTextoContenido: string | null;
}): DjInterrupcionesConfig {
  return {
    presentacionCadaTemas: row.presentacionCadaTemas,
    djHoraActiva: row.djHoraActiva,
    djHoraIntervaloMin: row.djHoraIntervaloMin,
    djClimaActivo: row.djClimaActivo,
    djClimaIntervaloMin: row.djClimaIntervaloMin,
    djPublicidadActiva: row.djPublicidadActiva,
    djPublicidadIntervaloMin: row.djPublicidadIntervaloMin,
    djAudioActiva: row.djAudioActiva,
    djAudioIntervaloMin: row.djAudioIntervaloMin,
    djAudioCarpetaId: row.djAudioCarpetaId,
    djTextoActiva: row.djTextoActiva,
    djTextoIntervaloMin: row.djTextoIntervaloMin,
    djTextoContenido: row.djTextoContenido,
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
    aa: config.djAudioActiva,
    ai: config.djAudioIntervaloMin,
    ac: config.djAudioCarpetaId,
    ta: config.djTextoActiva,
    ti: config.djTextoIntervaloMin,
    tc: config.djTextoContenido,
  });
}
