import { EstadoBloque } from "@prisma/client";
import { generarAudioNoticia } from "@/lib/audio/noticiaAudio";
import { parsearDialogo } from "@/lib/audio/dialogoParser";
import { generarTextoGemini } from "@/lib/gemini/guiones";
import { buildNoticiaPrompt } from "@/lib/gemini/prompts/noticia";
import { etiquetaLocutorDialogo } from "@/lib/gemini/locutorPrompt";
import { extraerContenidoNoticia } from "@/lib/noticias/scraper";
import { getFechaHoraArgentina } from "@/lib/fecha";
import { prisma } from "@/lib/prisma";
import { resolverLocutorPorGeminiVoiceId } from "@/lib/voces/resolverLocutor";
import type { BloqueConRadio } from "./apertura";

const MIN_TURNOS = 4;
const RETRY_SUFFIX =
  "\n\nIMPORTANTE: el guión anterior no cumplió el mínimo de 4 turnos. Generá un diálogo con al menos 4 turnos alternando LOCUTOR_A y LOCUTOR_B.";

async function generarGuionNoticiaDialogo(bloque: BloqueConRadio, contenido: string): Promise<string> {
  const config = (bloque.config ?? {}) as Record<string, unknown>;
  const radioId = bloque.programa.radioId;
  const locutorA = await resolverLocutorPorGeminiVoiceId(radioId, bloque.elevenlabsVoiceId, "LOCUTOR_A");
  const locutorB = await resolverLocutorPorGeminiVoiceId(radioId, bloque.elevenlabsVoiceId2, "LOCUTOR_B");
  const rawEstilo = String(config.estiloConversacion ?? "profesional");
  const estiloConversacion: "profesional" | "distendido" =
    rawEstilo === "distendido" ? "distendido" : "profesional";

  const prompt = buildNoticiaPrompt({
    contenidoNoticia: contenido,
    estiloRadio: bloque.programa.radio.estiloLocucion ?? "profesional",
    nombrePrograma: bloque.programa.nombre,
    locutorA,
    locutorB,
    estiloConversacion,
    referenciaTemporalEmision: getFechaHoraArgentina(),
  });

  const etiquetas = {
    locutorA: etiquetaLocutorDialogo(locutorA?.nombre, "LOCUTOR_A"),
    locutorB: etiquetaLocutorDialogo(locutorB?.nombre, "LOCUTOR_B"),
  };

  let guion = await generarTextoGemini(prompt, radioId);
  let turnos = parsearDialogo(guion, etiquetas);
  if (turnos.length < MIN_TURNOS) {
    guion = await generarTextoGemini(prompt + RETRY_SUFFIX, radioId);
    turnos = parsearDialogo(guion, etiquetas);
  }
  if (turnos.length < MIN_TURNOS) {
    throw new Error(`Guión de noticia con menos de ${MIN_TURNOS} turnos`);
  }

  return guion;
}

export async function generarNoticiaPreview(bloque: BloqueConRadio): Promise<void> {
  const config = (bloque.config ?? {}) as Record<string, unknown>;
  let contenido =
    typeof config.contenidoNoticiaCache === "string" && config.contenidoNoticiaCache.length > 0
      ? config.contenidoNoticiaCache
      : null;

  if (!contenido && typeof config.urlNoticia === "string" && config.urlNoticia.length > 0) {
    contenido = await extraerContenidoNoticia(config.urlNoticia, bloque.programa.radioId);
    await prisma.bloque.update({
      where: { id: bloque.id },
      data: {
        config: {
          ...config,
          urlNoticia: config.urlNoticia,
          contenidoNoticiaCache: contenido,
        } as object,
      },
    });
  }

  if (!contenido) {
    throw new Error("Falta URL de noticia o contenido analizado");
  }

  const voiceIdA = bloque.elevenlabsVoiceId;
  const voiceIdB = bloque.elevenlabsVoiceId2;
  if (!voiceIdA || !voiceIdB) {
    throw new Error("Faltan elevenlabsVoiceId o elevenlabsVoiceId2 para Noticia");
  }

  const guion = await generarGuionNoticiaDialogo(bloque, contenido);

  await prisma.bloque.update({
    where: { id: bloque.id },
    data: { guion, estado: EstadoBloque.GUION_LISTO },
  });

  const radioId = bloque.programa.radioId;
  const locutorA = await resolverLocutorPorGeminiVoiceId(radioId, voiceIdA, "LOCUTOR_A");
  const locutorB = await resolverLocutorPorGeminiVoiceId(radioId, voiceIdB, "LOCUTOR_B");

  await generarAudioNoticia({
    guion,
    voiceIdA,
    voiceIdB,
    bloqueId: bloque.id,
    radioId,
    etiquetas: {
      locutorA: etiquetaLocutorDialogo(locutorA?.nombre, "LOCUTOR_A"),
      locutorB: etiquetaLocutorDialogo(locutorB?.nombre, "LOCUTOR_B"),
    },
  });

  await prisma.bloque.update({
    where: { id: bloque.id },
    data: {
      audioUrl: `/api/audio/preview/${bloque.id}`,
      estado: EstadoBloque.GENERANDO_AUDIO,
    },
  });
}
