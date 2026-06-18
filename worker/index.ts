import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { EstadoBloque, EstadoGeneracion, EstadoPrograma, TipoBloque } from "@prisma/client";
import { Job, Worker } from "bullmq";
import { getAudioDuration } from "@/lib/audio/ffmpeg";
import { generarAudioNoticia } from "@/lib/audio/noticiaAudio";
import { ensamblarPrograma } from "@/lib/audio/ensamblar";
import { elevenLabsTTS } from "@/lib/elevenlabs/tts";
import { generarGuionPorTipo } from "@/lib/gemini/guiones";
import {
  resolverLocutorPorGeminiVoiceId,
  resolverLocutorPorVozId,
} from "@/lib/voces/resolverLocutor";
import { generarAudio } from "@/lib/gemini/tts";
import { fetchNoticias } from "@/lib/noticias/rss";
import { getQueueConnection } from "@/lib/queue/connection";
import { prisma } from "@/lib/prisma";
import { procesarGenerarPreview } from "./processors/generarPreview";
import { procesarGenerarPresentacionSpotify } from "./processors/spotify/generarPresentacion";
import type { SpotifyPresentacionJob } from "@/lib/queue/jobs";

type GenerarProgramaJob = {
  programaId: string;
  generacionId: string;
};

async function procesarGeneracion(job: Job<GenerarProgramaJob>): Promise<void> {
  const { programaId, generacionId } = job.data;
  const programa = await prisma.programa.findUnique({
    where: { id: programaId },
    include: { radio: true, bloques: { include: { voz: true }, orderBy: { orden: "asc" } } },
  });
  if (!programa) throw new Error("Programa no encontrado");

  await prisma.generacion.update({ where: { id: generacionId }, data: { estado: EstadoGeneracion.PROCESANDO } });
  await prisma.programa.update({ where: { id: programaId }, data: { estado: EstadoPrograma.GENERANDO } });

  const basePath = process.env.AUDIO_STORAGE_PATH ?? "/app/storage/audio";
  const outDir = join(basePath, programa.radioId, programa.id);
  await mkdir(outDir, { recursive: true });
  const noticias = await fetchNoticias({ fuentesRSS: programa.radio.fuentesNoticias, cantidad: 8 });

  let errores = 0;
  for (let index = 0; index < programa.bloques.length; index += 1) {
    const bloque = programa.bloques[index];
    try {
      await prisma.bloque.update({ where: { id: bloque.id }, data: { estado: EstadoBloque.GENERANDO_GUION } });

      const locutorA =
        (await resolverLocutorPorVozId(programa.radioId, bloque.vozId, "LOCUTOR_A")) ??
        (await resolverLocutorPorGeminiVoiceId(programa.radioId, bloque.elevenlabsVoiceId, "LOCUTOR_A"));
      const locutorB = await resolverLocutorPorGeminiVoiceId(
        programa.radioId,
        bloque.elevenlabsVoiceId2,
        "LOCUTOR_B",
      );

      const guion = await generarGuionPorTipo({
        radioId: programa.radioId,
        tipo: bloque.tipo,
        titulo: bloque.titulo,
        config: (bloque.config ?? {}) as Record<string, unknown>,
        estiloRadio: programa.radio.estiloLocucion ?? "profesional",
        nombrePrograma: programa.nombre,
        nombreRadio: programa.radio.nombre,
        noticias,
        locutorA,
        locutorB,
      });
      await prisma.bloque.update({ where: { id: bloque.id }, data: { guion, estado: EstadoBloque.GUION_LISTO } });
      await prisma.bloque.update({ where: { id: bloque.id }, data: { estado: EstadoBloque.GENERANDO_AUDIO } });
      const defaultVoice = process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? "QK4xDwo9ESPHA4JNUpX3";
      const esSeccionEleven =
        bloque.tipo === TipoBloque.APERTURA ||
        bloque.tipo === TipoBloque.NOTICIA ||
        bloque.tipo === TipoBloque.PUBLICIDAD ||
        bloque.tipo === TipoBloque.CIERRE;

      if (esSeccionEleven) {
        const audioPathMp3 = join(outDir, `${bloque.id}.mp3`);
        if (bloque.tipo === TipoBloque.NOTICIA) {
          const bloqueDir = join(outDir, bloque.id);
          await mkdir(bloqueDir, { recursive: true });
          const { path, duracion } = await generarAudioNoticia({
            guion,
            voiceIdA: bloque.elevenlabsVoiceId ?? defaultVoice,
            voiceIdB: bloque.elevenlabsVoiceId2 ?? defaultVoice,
            bloqueId: bloque.id,
            baseDirOverride: bloqueDir,
            radioId: programa.radioId,
          });
          await prisma.bloque.update({
            where: { id: bloque.id },
            data: { estado: EstadoBloque.LISTO, audioUrl: path, duracion },
          });
        } else {
          await elevenLabsTTS({
            text: guion,
            voiceId: bloque.elevenlabsVoiceId ?? defaultVoice,
            outputPath: audioPathMp3,
            radioId: programa.radioId,
          });
          const duracion = await getAudioDuration(audioPathMp3);
          await prisma.bloque.update({
            where: { id: bloque.id },
            data: { estado: EstadoBloque.LISTO, audioUrl: audioPathMp3, duracion },
          });
        }
      } else {
        const audioPath = join(outDir, `${bloque.id}.wav`);
        const audio = await generarAudio({
          texto: guion,
          vozId: bloque.voz?.geminiVoiceId ?? defaultVoice,
          outputPath: audioPath,
          radioId: programa.radioId,
        });
        await prisma.bloque.update({
          where: { id: bloque.id },
          data: { estado: EstadoBloque.LISTO, audioUrl: audio.path, duracion: audio.duracion },
        });
      }
    } catch (error) {
      errores += 1;
      await prisma.bloque.update({ where: { id: bloque.id }, data: { estado: EstadoBloque.ERROR } });
      console.error("Error bloque", bloque.id, error);
    }
    await job.updateProgress(Math.round(((index + 1) / programa.bloques.length) * 100));
  }

  if (errores > Math.floor(programa.bloques.length / 2)) {
    await prisma.generacion.update({
      where: { id: generacionId },
      data: { estado: EstadoGeneracion.ERROR, errorLog: `Errores en ${errores} bloques` },
    });
    await prisma.programa.update({ where: { id: programaId }, data: { estado: EstadoPrograma.BORRADOR } });
    return;
  }

  const bloquesConAudio = await prisma.bloque.findMany({
    where: { programaId, estado: EstadoBloque.LISTO, audioUrl: { not: null } },
    orderBy: { orden: "asc" },
  });
  const resultado = await ensamblarPrograma({
    bloques: bloquesConAudio.map((b) => ({ audioPath: b.audioUrl ?? "", orden: b.orden })),
    outputPath: join(outDir, "programa_final.mp3"),
  });

  await prisma.generacion.update({
    where: { id: generacionId },
    data: {
      estado: EstadoGeneracion.COMPLETADA,
      audioFinalUrl: resultado.path,
      duracionTotal: resultado.duracionTotal,
      completadaAt: new Date(),
    },
  });
  await prisma.programa.update({
    where: { id: programaId },
    data: { estado: EstadoPrograma.LISTO, duracionEstimada: resultado.duracionTotal },
  });
}

const worker = new Worker<GenerarProgramaJob>(
  "generacion",
  async (job) => {
    if (job.name === "generar-programa") {
      await procesarGeneracion(job);
    }
  },
  { connection: getQueueConnection() },
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id ?? "desconocido"} fallo`, err.message);
});

const previewWorker = new Worker<{ bloqueId: string }>(
  "generarPreview",
  async (job) => {
    if (job.name === "generar-preview") {
      await procesarGenerarPreview(job);
    }
  },
  { connection: getQueueConnection() },
);

previewWorker.on("failed", (job, err) => {
  console.error(`Preview job ${job?.id ?? "desconocido"} fallo`, err.message);
});

const spotifyPresentacionWorker = new Worker<SpotifyPresentacionJob>(
  "spotify-presentaciones",
  async (job) => {
    if (job.name === "generarPresentacion") {
      await procesarGenerarPresentacionSpotify(job);
    }
  },
  { connection: getQueueConnection() },
);

spotifyPresentacionWorker.on("failed", (job, err) => {
  console.error(`Spotify presentacion job ${job?.id ?? "desconocido"} fallo`, err.message);
});
