import { ProveedorConsumo } from "@prisma/client";
import { consultarCuotaElevenLabs } from "@/lib/elevenlabs/quota";
import { rangoPeriodoConsumo } from "@/lib/consumo/periodo";
import { prisma } from "@/lib/prisma";
import type { PeriodoConsumo, ResumenConsumoApis } from "@/types/consumo";

export async function obtenerResumenConsumoApis(
  radioId: string,
  tipoPeriodo: PeriodoConsumo,
  referencia = new Date(),
): Promise<ResumenConsumoApis> {
  const rango = rangoPeriodoConsumo(tipoPeriodo, referencia);

  const registros = await prisma.consumoApiRegistro.findMany({
    where: {
      radioId,
      createdAt: {
        gte: rango.desde,
        lt: rango.hastaExclusive,
      },
    },
    select: {
      proveedor: true,
      tokensEntrada: true,
      tokensSalida: true,
      caracteres: true,
      costoEstimadoUsd: true,
    },
  });

  let geminiEntrada = 0;
  let geminiSalida = 0;
  let geminiCosto = 0;
  let geminiLlamadas = 0;
  let elevenChars = 0;
  let elevenCosto = 0;
  let elevenLlamadas = 0;

  for (const registro of registros) {
    if (registro.proveedor === ProveedorConsumo.GEMINI) {
      geminiEntrada += registro.tokensEntrada ?? 0;
      geminiSalida += registro.tokensSalida ?? 0;
      geminiCosto += registro.costoEstimadoUsd;
      geminiLlamadas += 1;
    } else {
      elevenChars += registro.caracteres ?? 0;
      elevenCosto += registro.costoEstimadoUsd;
      elevenLlamadas += 1;
    }
  }

  let suscripcion = null;
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      suscripcion = await consultarCuotaElevenLabs();
    } catch {
      suscripcion = null;
    }
  }

  return {
    periodo: {
      tipo: tipoPeriodo,
      desde: rango.desdeIso,
      hasta: rango.hastaIso,
      etiqueta: rango.etiqueta,
    },
    gemini: {
      tokensEntrada: geminiEntrada,
      tokensSalida: geminiSalida,
      costoEstimadoUsd: geminiCosto,
      llamadas: geminiLlamadas,
    },
    elevenlabs: {
      caracteresRegistrados: elevenChars,
      costoEstimadoUsd: elevenCosto,
      llamadas: elevenLlamadas,
      suscripcion,
    },
  };
}
