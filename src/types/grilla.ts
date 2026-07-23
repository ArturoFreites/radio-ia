import type { DjInterrupcionesConfig } from "@/lib/grilla/djConfigSchema";

export type ModoAire = "DJ" | "IDLE";

export type TipoInterrupcionDj = "HORA" | "CLIMA" | "PUBLICIDAD" | "AUDIO";

export type DjInterrupcionAudiosResponse = {
  archivos: Array<{ id: string; nombre: string; duracionSec: number | null }>;
  modoRotacion: "SECUENCIAL" | "ALEATORIO";
  carpetaNombre: string;
};


export type SlotHoy = {
  id: string;
  tipo: "DJ";
  horaInicio: string;
  duracionMin: number;
  origen: "slot" | "evento";
  playlistId?: string;
  playlistNombre?: string;
  voz1GeminiId?: string;
  voz2GeminiId?: string;
  voz1Nombre?: string;
  voz2Nombre?: string;
} & DjInterrupcionesConfig;

export type GrillaHoyResponse = { slots: SlotHoy[] };

export type PublicidadAireItem = {
  id: string;
  nombre: string;
  tieneAudio: boolean;
  tieneTexto: boolean;
};

export type SpotifySesionAire = {
  sesionId: string;
  panelToken: string;
  playlistId: string;
  playlistNombre: string;
};

export type EstadoAire = {
  radioNombre: string;
  radioCiudad: string;
  slotsDelDia: SlotHoy[];
  publicidades: PublicidadAireItem[];
  ahora: SlotHoy | null;
  siguiente: SlotHoy | null;
  segundosHastaFin: number | null;
  segundosHastaSiguiente: number | null;
  spotifySesion: SpotifySesionAire | null;
  sinSesionDj?: boolean;
  vozGeminiId?: string | null;
};

/** Fila de slot semanal en el editor de grilla (API GET /api/grilla/slots). */
export type GrillaEditorVozRef = { id: string; nombre: string };

export type GrillaEditorSlotRow = {
  id: string;
  diaDeSemana: number;
  horaInicio: string;
  duracionMin: number;
  tipo: string;
  esActivo: boolean;
  playlistId: string | null;
  playlistNombre: string | null;
  voz1: GrillaEditorVozRef | null;
  voz2: GrillaEditorVozRef | null;
} & DjInterrupcionesConfig;

/** Fila de evento puntual en el editor de grilla (API GET /api/grilla/eventos). */
export type GrillaEditorEventoRow = {
  id: string;
  fecha: string;
  horaInicio: string;
  duracionMin: number;
  tipo: string;
  playlistId: string | null;
  playlistNombre: string | null;
  voz1: GrillaEditorVozRef | null;
  voz2: GrillaEditorVozRef | null;
} & DjInterrupcionesConfig;

export type DjInterrupcionGuionRequest = {
  aireToken: string;
  tipo: TipoInterrupcionDj;
  publicidadId?: string;
};

export type DjInterrupcionGuionResponse = { guion: string };

export type DjInterrupcionPublicidadResponse = {
  publicidades: Array<{
    id: string;
    nombre: string;
    tieneAudio: boolean;
    tieneTexto: boolean;
  }>;
};
