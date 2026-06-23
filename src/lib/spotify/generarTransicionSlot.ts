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
import { buildTransicionSlotPrompt } from "@/lib/spotify/prompts";
import { resolverLocutorPorGeminiVoiceId } from "@/lib/voces/resolverLocutor";
import type { SlotHoy } from "@/types/grilla";

const CACHE_TRANSICION_MS = 30 * 60 * 1000;

export function transicionSlotAudioPath(slotId: string): string {
  const base = process.env.AUDIO_STORAGE_PATH ?? "/app/storage/audio";
  return join(base, "spotify", `transicion-slot-${slotId}.mp3`);
}

export function buildTransicionSlotAudioUrl(aireToken: string, slotId: string): string {
  const q = new URLSearchParams({ token: aireToken, slotId });
  return `/api/aire/transicion-slot?${q.toString()}`;
}

async function transicionCacheValida(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return Date.now() - info.mtimeMs < CACHE_TRANSICION_MS;
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

export async function generarTransicionSlot(
  radioId: string,
  slot: SlotHoy,
  aireToken: string,
): Promise<string | null> {
  const voiceId = slot.voz1GeminiId;
  if (!voiceId || !slot.playlistId) {
    return null;
  }

  const audioFinal = transicionSlotAudioPath(slot.id);
  if (await transicionCacheValida(audioFinal)) {
    return buildTransicionSlotAudioUrl(aireToken, slot.id);
  }

  const [radio, conexion] = await Promise.all([
    prisma.radio.findUnique({
      where: { id: radioId },
      select: { nombre: true, estiloLocucion: true },
    }),
    prisma.spotifyConexion.findUnique({ where: { radioId } }),
  ]);
  if (!radio) {
    return null;
  }

  try {
    const locutor = await resolverLocutorPorGeminiVoiceId(radioId, voiceId, "LOCUTOR_A");
    const primeraCancion = await resolverPrimeraCancion(slot.playlistId, conexion);
    const programaNombre = slot.playlistNombre ?? "Modo DJ";
    const djNombre = slot.voz1Nombre ? `DJ ${slot.voz1Nombre}` : "Airon";

    const prompt = buildTransicionSlotPrompt({
      programaNombre,
      djNombre,
      estiloRadio: radio.estiloLocucion ?? "profesional radial",
      locutor,
      primeraCancion,
    });

    const guion = (await generarTextoGemini(prompt, radioId)).trim();
    if (!guion) {
      return null;
    }

    await mkdir(join(process.env.AUDIO_STORAGE_PATH ?? "/app/storage/audio", "spotify"), {
      recursive: true,
    });
    await elevenLabsTTS({
      text: guion,
      voiceId,
      outputPath: audioFinal,
      radioId,
    });
    await getAudioDuration(audioFinal);

    return buildTransicionSlotAudioUrl(aireToken, slot.id);
  } catch {
    return null;
  }
}
