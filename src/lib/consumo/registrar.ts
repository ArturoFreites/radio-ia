import type { GenerateContentResponse } from "@google/genai";
import { ProveedorConsumo, TipoConsumoApi } from "@prisma/client";
import { GEMINI_TEXT_MODEL } from "@/lib/gemini/client";
import { calcularCostoElevenLabsUsd, calcularCostoGeminiUsd } from "@/lib/consumo/constants";
import { prisma } from "@/lib/prisma";

type GeminiUsage = {
  tokensEntrada: number;
  tokensSalida: number;
};

export function extraerUsoGemini(response: GenerateContentResponse): GeminiUsage {
  const meta = response.usageMetadata;
  const tokensEntrada = (meta?.promptTokenCount ?? 0) + (meta?.thoughtsTokenCount ?? 0);
  const tokensSalida = meta?.candidatesTokenCount ?? 0;
  return { tokensEntrada, tokensSalida };
}

export async function registrarConsumoGemini(params: {
  radioId: string;
  response: GenerateContentResponse;
  modelo?: string;
}): Promise<void> {
  if (!params.radioId) return;

  const { tokensEntrada, tokensSalida } = extraerUsoGemini(params.response);
  if (tokensEntrada === 0 && tokensSalida === 0) return;

  await prisma.consumoApiRegistro.create({
    data: {
      radioId: params.radioId,
      proveedor: ProveedorConsumo.GEMINI,
      tipo: TipoConsumoApi.TEXTO,
      tokensEntrada,
      tokensSalida,
      costoEstimadoUsd: calcularCostoGeminiUsd(tokensEntrada, tokensSalida),
      modelo: params.modelo ?? GEMINI_TEXT_MODEL,
    },
  });
}

export async function registrarConsumoElevenLabs(params: {
  radioId: string;
  caracteres: number;
  modelo?: string;
}): Promise<void> {
  if (!params.radioId || params.caracteres <= 0) return;

  await prisma.consumoApiRegistro.create({
    data: {
      radioId: params.radioId,
      proveedor: ProveedorConsumo.ELEVENLABS,
      tipo: TipoConsumoApi.VOZ,
      caracteres: params.caracteres,
      costoEstimadoUsd: calcularCostoElevenLabsUsd(params.caracteres, params.modelo),
      modelo: params.modelo,
    },
  });
}
