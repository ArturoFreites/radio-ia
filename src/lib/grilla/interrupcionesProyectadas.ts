import type { DjInterrupcionesConfig } from "@/lib/grilla/djConfigSchema";
import type { TipoInterrupcionDj } from "@/types/grilla";

export type InterrupcionProyectada = {
  tipo: TipoInterrupcionDj;
  offsetMin: number;
};

type InterrupcionActiva = {
  tipo: TipoInterrupcionDj;
  intervaloMin: number;
};

function interrupcionesActivas(config: DjInterrupcionesConfig): InterrupcionActiva[] {
  const out: InterrupcionActiva[] = [];
  if (config.djHoraActiva && config.djHoraIntervaloMin !== null) {
    out.push({ tipo: "HORA", intervaloMin: config.djHoraIntervaloMin });
  }
  if (config.djClimaActivo && config.djClimaIntervaloMin !== null) {
    out.push({ tipo: "CLIMA", intervaloMin: config.djClimaIntervaloMin });
  }
  if (config.djPublicidadActiva && config.djPublicidadIntervaloMin !== null) {
    out.push({ tipo: "PUBLICIDAD", intervaloMin: config.djPublicidadIntervaloMin });
  }
  if (config.djAudioActiva && config.djAudioIntervaloMin !== null) {
    out.push({ tipo: "AUDIO", intervaloMin: config.djAudioIntervaloMin });
  }
  return out;
}

export function calcularInterrupcionesProyectadas(
  duracionMin: number,
  config: DjInterrupcionesConfig,
): InterrupcionProyectada[] {
  const activas = interrupcionesActivas(config);
  const result: InterrupcionProyectada[] = [];

  for (const { tipo, intervaloMin } of activas) {
    for (let offset = intervaloMin; offset < duracionMin; offset += intervaloMin) {
      result.push({ tipo, offsetMin: offset });
    }
  }

  return result.sort((a, b) => a.offsetMin - b.offsetMin || a.tipo.localeCompare(b.tipo));
}

export function leyendaInterrupciones(config: DjInterrupcionesConfig): string | null {
  const parts: string[] = [];
  if (config.djHoraActiva) parts.push("H");
  if (config.djClimaActivo) parts.push("C");
  if (config.djPublicidadActiva) parts.push("P");
  if (config.djAudioActiva) parts.push("A");
  if (parts.length === 0) return null;
  return parts.join(" · ");
}
