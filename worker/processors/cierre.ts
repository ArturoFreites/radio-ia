import { join } from "node:path";
import { EstadoBloque } from "@prisma/client";
import { getPreviewDirForBloque } from "@/lib/audio/previewPaths";
import { elevenLabsTTS } from "@/lib/elevenlabs/tts";
import { generarTextoGemini } from "@/lib/gemini/guiones";
import { buildCierrePrompt } from "@/lib/gemini/prompts/cierre";
import { prisma } from "@/lib/prisma";
import { resolverLocutorPorGeminiVoiceId } from "@/lib/voces/resolverLocutor";
import type { BloqueConRadio } from "./apertura";

export async function generarCierrePreview(bloque: BloqueConRadio): Promise<void> {
  const config = (bloque.config ?? {}) as Record<string, unknown>;
  const mensajeRaw = config.mensajeDespedida;
  const mensajeDespedida =
    typeof mensajeRaw === "string" && mensajeRaw.trim().length > 0 ? mensajeRaw.trim() : undefined;

  const locutor = await resolverLocutorPorGeminiVoiceId(
    bloque.programa.radioId,
    bloque.elevenlabsVoiceId,
    "LOCUTOR_A",
  );

  const prompt = buildCierrePrompt({
    nombrePrograma: String(config.nombrePrograma ?? bloque.programa.nombre),
    nombreRadio: bloque.programa.radio.nombre,
    mensajeDespedida,
    estiloRadio: bloque.programa.radio.estiloLocucion ?? "profesional",
    locutor,
  });

  const guion = await generarTextoGemini(prompt, bloque.programa.radioId);
  await prisma.bloque.update({
    where: { id: bloque.id },
    data: { guion, estado: EstadoBloque.GUION_LISTO },
  });

  const voiceId = bloque.elevenlabsVoiceId;
  if (!voiceId) {
    throw new Error("Falta elevenlabsVoiceId para Cierre");
  }

  const dir = getPreviewDirForBloque(bloque.id);
  const out = join(dir, "cierre.mp3");
  await elevenLabsTTS({ text: guion, voiceId, outputPath: out, radioId: bloque.programa.radioId });

  await prisma.bloque.update({
    where: { id: bloque.id },
    data: {
      audioUrl: `/api/audio/preview/${bloque.id}`,
      estado: EstadoBloque.GENERANDO_AUDIO,
    },
  });
}
