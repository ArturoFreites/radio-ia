import type { ElevenLabsQuota } from "@/lib/elevenlabs/quota";

export type PeriodoConsumo = "semana" | "mes";

export type ResumenConsumoApis = {
  periodo: {
    tipo: PeriodoConsumo;
    desde: string;
    hasta: string;
    etiqueta: string;
  };
  gemini: {
    tokensEntrada: number;
    tokensSalida: number;
    costoEstimadoUsd: number;
    llamadas: number;
  };
  elevenlabs: {
    caracteresRegistrados: number;
    costoEstimadoUsd: number;
    llamadas: number;
    suscripcion: ElevenLabsQuota | null;
  };
};
