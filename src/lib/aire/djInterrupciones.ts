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

export type ProximaInterrupcionDj = {
  tipo: TipoInterrupcionDj;
  enMs: number;
  /** Solo HORA: instante exacto en que debe sonar la locución. */
  horaObjetivoMs?: number;
};

export function calcularProximaHoraAnclada(
  anclaInicioMs: number,
  intervaloMin: number,
  ahoraMs: number,
): { enMs: number; horaObjetivoMs: number } {
  const intervaloMs = intervaloMin * 60_000;
  let n = 1;
  while (anclaInicioMs + n * intervaloMs <= ahoraMs) {
    n += 1;
  }
  const horaObjetivoMs = anclaInicioMs + n * intervaloMs;
  return { enMs: Math.max(0, horaObjetivoMs - ahoraMs), horaObjetivoMs };
}

export function calcularProximaInterrupcion(
  config: DjInterrupcionesConfig,
  ultimas: UltimaEjecucionMap,
  ahoraMs: number,
  anclaInicioMs?: number | null,
): ProximaInterrupcionDj | null {
  const activos = timersActivos(config);
  if (activos.length === 0) return null;

  let mejor: ProximaInterrupcionDj | null = null;

  for (const { tipo, intervaloMin } of activos) {
    let candidato: ProximaInterrupcionDj;

    if (tipo === "HORA" && anclaInicioMs != null) {
      const { enMs, horaObjetivoMs } = calcularProximaHoraAnclada(anclaInicioMs, intervaloMin, ahoraMs);
      candidato = { tipo, enMs, horaObjetivoMs };
    } else {
      const intervaloMs = intervaloMin * 60_000;
      const ultima = ultimas[tipo] ?? ahoraMs;
      const proxima = ultima + intervaloMs;
      const enMs = Math.max(0, proxima - ahoraMs);
      candidato = { tipo, enMs };
    }

    if (!mejor || candidato.enMs < mejor.enMs) {
      mejor = candidato;
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

/** Fracción del intervalo de hora usada para preparar el audio con antelación (50 %). */
export const DJ_INTERRUPCION_HORA_PREP_FRACCION = 0.5;

export function msAntesPrepararHora(intervaloMin: number): number {
  return Math.round(intervaloMin * 60_000 * DJ_INTERRUPCION_HORA_PREP_FRACCION);
}

export function claveCacheInterrupcion(
  tipo: TipoInterrupcionDj,
  publicidadId?: string,
  horaObjetivoMs?: number,
): string {
  if (tipo === "HORA" && horaObjetivoMs != null) return `${tipo}:${horaObjetivoMs}`;
  if (tipo === "PUBLICIDAD" && publicidadId) return `${tipo}:${publicidadId}`;
  return tipo;
}

export function msHastaPrepararInterrupcion(
  tipo: TipoInterrupcionDj,
  enMs: number,
  intervaloMin?: number | null,
): number {
  if (enMs <= 5_000) return 0;
  if (tipo === "HORA" && intervaloMin != null) {
    return Math.max(0, enMs - msAntesPrepararHora(intervaloMin));
  }
  return 0;
}
