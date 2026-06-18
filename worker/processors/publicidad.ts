import { join } from "node:path";
import { EstadoBloque } from "@prisma/client";
import { getPreviewDirForBloque } from "@/lib/audio/previewPaths";
import { generarTextoGemini } from "@/lib/gemini/guiones";
import { buildBusquedaAnunciantePrompt, buildPublicidadPrompt } from "@/lib/gemini/prompts/publicidad";
import { normalizarGuionParaLocucion } from "@/lib/publicidad/guionLocucion";
import { elevenLabsTTS } from "@/lib/elevenlabs/tts";
import { prisma } from "@/lib/prisma";
import { resolverLocutorPorGeminiVoiceId } from "@/lib/voces/resolverLocutor";
import type { BloqueConRadio } from "./apertura";

async function buscarInfoAnuncianteConGemini(input: {
  nombreAnunciante: string;
  urlAnunciante?: string;
  radioId: string;
}): Promise<string> {
  const prompt = buildBusquedaAnunciantePrompt({
    nombreAnunciante: input.nombreAnunciante,
    urlAnunciante: input.urlAnunciante,
  });
  return generarTextoGemini(prompt, input.radioId);
}

export async function generarPublicidadPreview(bloque: BloqueConRadio): Promise<void> {
  const config = (bloque.config ?? {}) as Record<string, unknown>;
  const nombre = String(config.nombreAnunciante ?? "").trim();
  if (!nombre) {
    throw new Error("Nombre de anunciante obligatorio");
  }

  const teniaCache =
    typeof config.infoAnuncianteCache === "string" && String(config.infoAnuncianteCache).trim().length > 0;

  let info: string;
  if (teniaCache) {
    info = String(config.infoAnuncianteCache);
  } else {
    info = await buscarInfoAnuncianteConGemini({
      nombreAnunciante: nombre,
      urlAnunciante: typeof config.urlAnunciante === "string" ? config.urlAnunciante : undefined,
      radioId: bloque.programa.radioId,
    });
    await prisma.bloque.update({
      where: { id: bloque.id },
      data: {
        config: {
          ...config,
          nombreAnunciante: nombre,
          infoAnuncianteCache: info,
        } as object,
      },
    });
  }

  const duracionObjetivo = Number(config.duracionObjetivo ?? 20);
  const locutor = await resolverLocutorPorGeminiVoiceId(
    bloque.programa.radioId,
    bloque.elevenlabsVoiceId,
    "LOCUTOR_A",
  );
  const prompt = buildPublicidadPrompt({
    nombreAnunciante: nombre,
    infoAnunciante: info,
    duracionObjetivo,
    estiloRadio: bloque.programa.radio.estiloLocucion ?? "profesional",
    locutor,
  });

  const guion = normalizarGuionParaLocucion(await generarTextoGemini(prompt, bloque.programa.radioId));
  await prisma.bloque.update({
    where: { id: bloque.id },
    data: { guion, estado: EstadoBloque.GUION_LISTO },
  });

  const voiceId = bloque.elevenlabsVoiceId;
  if (!voiceId) {
    throw new Error("Falta elevenlabsVoiceId para Publicidad");
  }

  const dir = getPreviewDirForBloque(bloque.id);
  const out = join(dir, "publicidad.mp3");
  await elevenLabsTTS({ text: guion, voiceId, outputPath: out, radioId: bloque.programa.radioId });

  await prisma.bloque.update({
    where: { id: bloque.id },
    data: {
      audioUrl: `/api/audio/preview/${bloque.id}`,
      estado: EstadoBloque.GENERANDO_AUDIO,
    },
  });
}
