import type { DjInterrupcionesConfig } from "@/lib/grilla/djConfigSchema";
import type { TipoInterrupcionDj } from "@/types/grilla";

const TZ_AR = "America/Argentina/Buenos_Aires";

export function formatHoraArgentina(d: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ_AR,
  }).format(d);
}

type InterrupcionTimer = {
  tipo: TipoInterrupcionDj;
  intervaloMin: number;
};

function timersActivos(config: DjInterrupcionesConfig): InterrupcionTimer[] {
  const out: InterrupcionTimer[] = [];
  if (config.djHoraActiva && config.djHoraIntervaloMin !== null) {
    out.push({ tipo: "HORA", intervaloMin: config.djHoraIntervaloMin });
  }
  if (config.djClimaActivo && config.djClimaIntervaloMin !== null) {
    out.push({ tipo: "CLIMA", intervaloMin: config.djClimaIntervaloMin });
  }
  if (config.djPublicidadActiva && config.djPublicidadIntervaloMin !== null) {
    out.push({ tipo: "PUBLICIDAD", intervaloMin: config.djPublicidadIntervaloMin });
  }
  return out;
}

export type UltimaEjecucionMap = Partial<Record<TipoInterrupcionDj, number>>;

export function calcularProximaInterrupcion(
  config: DjInterrupcionesConfig,
  ultimas: UltimaEjecucionMap,
  ahoraMs: number,
): { tipo: TipoInterrupcionDj; enMs: number } | null {
  const activos = timersActivos(config);
  if (activos.length === 0) return null;

  let mejor: { tipo: TipoInterrupcionDj; enMs: number } | null = null;

  for (const { tipo, intervaloMin } of activos) {
    const intervaloMs = intervaloMin * 60_000;
    const ultima = ultimas[tipo] ?? ahoraMs;
    const proxima = ultima + intervaloMs;
    const enMs = Math.max(0, proxima - ahoraMs);
    if (!mejor || enMs < mejor.enMs) {
      mejor = { tipo, enMs };
    }
  }

  return mejor;
}

export function siguienteIndicePublicidad(actual: number, total: number): number {
  if (total <= 0) return 0;
  return (actual + 1) % total;
}

export function descripcionClimaCodigo(codigo: number): string {
  if (codigo === 0) return "despejado";
  if (codigo <= 3) return "parcialmente nublado";
  if (codigo <= 48) return "nublado";
  if (codigo <= 67) return "lluvia";
  if (codigo <= 77) return "nieve";
  if (codigo <= 82) return "chaparrones";
  if (codigo <= 99) return "tormenta";
  return "variable";
}

export function parseClimaJson(raw: string): {
  temperatura: number;
  maxima: number;
  minima: number;
  codigo: number;
} | null {
  try {
    const data = JSON.parse(raw) as {
      temperatura?: number;
      maxima?: number;
      minima?: number;
      codigo?: number;
    };
    if (
      typeof data.temperatura !== "number" ||
      typeof data.maxima !== "number" ||
      typeof data.minima !== "number" ||
      typeof data.codigo !== "number"
    ) {
      return null;
    }
    return {
      temperatura: data.temperatura,
      maxima: data.maxima,
      minima: data.minima,
      codigo: data.codigo,
    };
  } catch {
    return null;
  }
}

/** Cuánto esperar antes de la ejecución para regenerar la hora con precisión. */
export const DJ_INTERRUPCION_HORA_PREP_ANTES_MS = 45_000;

export function claveCacheInterrupcion(tipo: TipoInterrupcionDj, publicidadId?: string): string {
  if (tipo === "PUBLICIDAD" && publicidadId) return `${tipo}:${publicidadId}`;
  return tipo;
}

export function msHastaPrepararInterrupcion(tipo: TipoInterrupcionDj, enMs: number): number {
  if (enMs <= 5_000) return 0;
  if (tipo === "HORA") {
    return Math.max(0, enMs - DJ_INTERRUPCION_HORA_PREP_ANTES_MS);
  }
  return 0;
}
