import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { SpotifyConexion } from "@prisma/client";
import { getAudioDuration } from "@/lib/audio/ffmpeg";
import { elevenLabsTTS } from "@/lib/elevenlabs/tts";
import { generarTextoGemini } from "@/lib/gemini/guiones";
import { prisma } from "@/lib/prisma";
import { fetchPlaylistTracksFirstPage } from "@/lib/spotify/api";
import { getAccessTokenFresco } from "@/lib/spotify/auth";
import { normalizePlaylistId } from "@/lib/spotify/playlistId";
import { buildIntroAperturaPrompt } from "@/lib/spotify/prompts";
import { resolverLocutorPorGeminiVoiceId } from "@/lib/voces/resolverLocutor";

const CACHE_INTRO_MS = 30 * 60 * 1000;

function introAudioPath(sesionId: string, playlistId?: string | null): string {
  const base = process.env.AUDIO_STORAGE_PATH ?? "/app/storage/audio";
  if (playlistId) {
    const playlistHash = playlistId.slice(0, 8);
    return join(base, "spotify", `intro-${sesionId}-${playlistHash}.mp3`);
  }
  return join(base, "spotify", `intro-${sesionId}.mp3`);
}

function buildIntroAudioUrl(
  sesionId: string,
  panelToken: string,
  playlistId?: string | null,
): string {
  const q = new URLSearchParams({ token: panelToken });
  if (playlistId) {
    q.set("playlistId", playlistId);
  }
  return `/api/spotify/sesion/${sesionId}/intro-apertura?${q.toString()}`;
}

async function introCacheValida(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return Date.now() - info.mtimeMs < CACHE_INTRO_MS;
  } catch {
    return false;
  }
}

async function resolverPrimeraCancion(
  playlistId: string | null | undefined,
  conexion: SpotifyConexion | null,
): Promise<{ nombre: string; artista: string } | undefined> {
  if (!playlistId || !conexion) {
    return undefined;
  }
  try {
    const accessToken = await getAccessTokenFresco(conexion);
    const tracks = await fetchPlaylistTracksFirstPage(accessToken, normalizePlaylistId(playlistId));
    const first = tracks[0];
    if (!first?.name) {
      return undefined;
    }
    const artista = first.artists?.[0]?.name?.trim();
    if (!artista) {
      return undefined;
    }
    return { nombre: first.name, artista };
  } catch {
    return undefined;
  }
}

export async function generarIntroApertura(
  sesionId: string,
  playlistId?: string | null,
): Promise<string | null> {
  const sesion = await prisma.spotifySesion.findUnique({
    where: { id: sesionId },
    include: { radio: true, conexion: true },
  });
  if (!sesion || !sesion.voz1Id) {
    return null;
  }

  const cachePlaylistId = playlistId ?? sesion.playlistId;
  const audioFinal = introAudioPath(sesionId, cachePlaylistId);
  if (await introCacheValida(audioFinal)) {
    return buildIntroAudioUrl(sesionId, sesion.panelToken, cachePlaylistId);
  }

  try {
    const locutor = await resolverLocutorPorGeminiVoiceId(sesion.radioId, sesion.voz1Id, "LOCUTOR_A");
    const primeraCancion = await resolverPrimeraCancion(playlistId, sesion.conexion);

    const prompt = buildIntroAperturaPrompt({
      radioNombre: sesion.radio.nombre,
      estiloRadio: sesion.radio.estiloLocucion ?? "profesional radial",
      locutor,
      primeraCancion,
    });

    const guion = (await generarTextoGemini(prompt, sesion.radioId)).trim();
    if (!guion) {
      return null;
    }

    await mkdir(join(process.env.AUDIO_STORAGE_PATH ?? "/app/storage/audio", "spotify"), {
      recursive: true,
    });
    await elevenLabsTTS({
      text: guion,
      voiceId: sesion.voz1Id,
      outputPath: audioFinal,
      radioId: sesion.radioId,
    });
    await getAudioDuration(audioFinal);

    return buildIntroAudioUrl(sesionId, sesion.panelToken, cachePlaylistId);
  } catch {
    return null;
  }
}

export { introAudioPath };
