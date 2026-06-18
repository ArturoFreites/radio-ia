import { join } from "node:path";
import type { Bloque, Programa, Radio } from "@prisma/client";
import { EstadoBloque } from "@prisma/client";
import { getPreviewDirForBloque } from "@/lib/audio/previewPaths";
import { getDiaDeSemana } from "@/lib/fecha";
import { generarTextoGemini } from "@/lib/gemini/guiones";
import { buildAperturaPrompt } from "@/lib/gemini/prompts/apertura";
import { elevenLabsTTS } from "@/lib/elevenlabs/tts";
import { prisma } from "@/lib/prisma";
import { resolverLocutorPorGeminiVoiceId } from "@/lib/voces/resolverLocutor";

export type BloqueConRadio = Bloque & { programa: Programa & { radio: Radio } };

export async function generarAperturaPreview(bloque: BloqueConRadio): Promise<void> {
  const config = (bloque.config ?? {}) as Record<string, unknown>;
  const rawHorario = String(config.horario ?? "mañana").toLowerCase();
  const horario: "mañana" | "tarde" | "noche" =
    rawHorario === "tarde" ? "tarde" : rawHorario === "noche" ? "noche" : "mañana";

  const locutor = await resolverLocutorPorGeminiVoiceId(
    bloque.programa.radioId,
    bloque.elevenlabsVoiceId,
    "LOCUTOR_A",
  );

  const prompt = buildAperturaPrompt({
    nombrePrograma: String(config.nombrePrograma ?? bloque.programa.nombre),
    horario,
    diaDeSemana: getDiaDeSemana(),
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
    throw new Error("Falta elevenlabsVoiceId para Apertura");
  }

  const dir = getPreviewDirForBloque(bloque.id);
  const out = join(dir, "apertura.mp3");
  await elevenLabsTTS({ text: guion, voiceId, outputPath: out, radioId: bloque.programa.radioId });

  await prisma.bloque.update({
    where: { id: bloque.id },
    data: {
      audioUrl: `/api/audio/preview/${bloque.id}`,
      estado: EstadoBloque.GENERANDO_AUDIO,
    },
  });
}
