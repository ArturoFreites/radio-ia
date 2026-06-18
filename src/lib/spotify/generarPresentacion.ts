import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { EstadoPresentacion } from "@prisma/client";
import { getAudioDuration } from "@/lib/audio/ffmpeg";
import { elevenLabsTTS } from "@/lib/elevenlabs/tts";
import { generarTextoGemini } from "@/lib/gemini/guiones";
import { prisma } from "@/lib/prisma";
import { redisPublish } from "@/lib/redis";
import { fetchArtist, fetchTrack } from "@/lib/spotify/api";
import { getAccessTokenFresco } from "@/lib/spotify/auth";
import { buildSpotifyPresentacionPrompt } from "@/lib/spotify/prompts";
import { resolverLocutorPorGeminiVoiceId } from "@/lib/voces/resolverLocutor";

function spotifyAudioPath(presentacionId: string): string {
  const base = process.env.AUDIO_STORAGE_PATH ?? "/app/storage/audio";
  return join(base, "spotify", `${presentacionId}.mp3`);
}

export async function generarPresentacionTrack(presentacionId: string): Promise<void> {
  const presentacion = await prisma.presentacionTrack.findUnique({
    where: { id: presentacionId },
    include: { sesion: { include: { radio: true, conexion: true } } },
  });
  if (!presentacion) {
    return;
  }

  if (!presentacion.sesion.voz1Id) {
    await prisma.presentacionTrack.update({
      where: { id: presentacionId },
      data: { estado: EstadoPresentacion.LISTA, guion: null, audioUrl: null, errorLog: null },
    });
    return;
  }

  await prisma.presentacionTrack.update({
    where: { id: presentacionId },
    data: { estado: EstadoPresentacion.GENERANDO },
  });

  try {
    const accessToken = await getAccessTokenFresco(presentacion.sesion.conexion);
    const trackDetail = await fetchTrack(accessToken, presentacion.trackSpotifyId);
    const primaryArtistId = trackDetail.artists?.[0]?.id;
    let generos: string[] | undefined;
    let anioAlbum: string | undefined;
    const release = trackDetail.album?.release_date;
    if (release) {
      anioAlbum = release.slice(0, 4);
    }
    if (primaryArtistId) {
      const artista = await fetchArtist(accessToken, primaryArtistId);
      generos = artista.genres?.length ? artista.genres : undefined;
    }

    const radioId = presentacion.sesion.radioId;
    const locutor = await resolverLocutorPorGeminiVoiceId(radioId, presentacion.sesion.voz1Id, "LOCUTOR_A");

    const prompt = buildSpotifyPresentacionPrompt({
      trackNombre: presentacion.trackNombre,
      artistaNombre: presentacion.artistaNombre,
      albumNombre: presentacion.albumNombre,
      anioAlbum,
      generos,
      estiloRadio: presentacion.sesion.radio.estiloLocucion ?? "profesional radial",
      locutor,
    });

    const guion = (await generarTextoGemini(prompt, radioId)).trim();
    if (!guion) {
      throw new Error("Guion de presentación vacío");
    }

    const audioFinal = spotifyAudioPath(presentacionId);
    await mkdir(join(process.env.AUDIO_STORAGE_PATH ?? "/app/storage/audio", "spotify"), { recursive: true });
    await elevenLabsTTS({
      text: guion,
      voiceId: presentacion.sesion.voz1Id,
      outputPath: audioFinal,
      radioId,
    });
    await getAudioDuration(audioFinal);

    const q = new URLSearchParams({
      sesionId: presentacion.sesionId,
      token: presentacion.sesion.panelToken,
    });
    const audioUrl = `/api/audio/spotify/${presentacionId}?${q.toString()}`;
    await prisma.presentacionTrack.update({
      where: { id: presentacionId },
      data: {
        guion,
        audioUrl,
        estado: EstadoPresentacion.LISTA,
        errorLog: null,
        retries: 0,
      },
    });

    await redisPublish(`spotify:sesion:${presentacion.sesionId}`, {
      tipo: "PRESENTACION_LISTA",
      trackSpotifyId: presentacion.trackSpotifyId,
      audioUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.presentacionTrack.update({
      where: { id: presentacionId },
      data: {
        estado: EstadoPresentacion.ERROR,
        errorLog: message.slice(0, 2000),
      },
    });
    await redisPublish(`spotify:sesion:${presentacion.sesionId}`, {
      tipo: "PRESENTACION_ERROR",
      trackSpotifyId: presentacion.trackSpotifyId,
      message: message.slice(0, 500),
    });
  }
}
