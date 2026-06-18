import { EstadoSesionSpotify } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { normalizePlaylistId } from "@/lib/spotify/playlistId";
import type { SpotifySesionAire } from "@/types/grilla";

const DJ_SLOT_REDIS_PREFIX = "dj:slot:";

type DjSlotRedisState = {
  slotId: string;
  sesionId: string;
};

function djSlotRedisKey(radioId: string): string {
  return `${DJ_SLOT_REDIS_PREFIX}${radioId}`;
}

async function readDjSlotState(radioId: string): Promise<DjSlotRedisState | null> {
  const raw = await getRedis().get(djSlotRedisKey(radioId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DjSlotRedisState;
    if (typeof parsed.slotId === "string" && typeof parsed.sesionId === "string") {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

async function writeDjSlotState(radioId: string, state: DjSlotRedisState): Promise<void> {
  await getRedis().set(djSlotRedisKey(radioId), JSON.stringify(state));
}

async function finalizarSesionDj(sesionId: string, radioId: string): Promise<void> {
  await prisma.spotifySesion.updateMany({
    where: {
      id: sesionId,
      radioId,
      estado: { not: EstadoSesionSpotify.FINALIZADA },
    },
    data: { estado: EstadoSesionSpotify.FINALIZADA },
  });
}

const spotifySesionSelect = {
  id: true,
  panelToken: true,
  playlistId: true,
  playlistNombre: true,
} as const;

export type SpotifySesionRow = {
  id: string;
  panelToken: string;
  playlistId: string;
  playlistNombre: string;
};

/** Sesión DJ para /aire: ACTIVA reciente, o la más reciente de la radio si no hay ACTIVA. */
export async function buscarSpotifySesionParaAire(radioId: string): Promise<SpotifySesionRow | null> {
  const activa = await prisma.spotifySesion.findFirst({
    where: { radioId, estado: EstadoSesionSpotify.ACTIVA },
    orderBy: { updatedAt: "desc" },
    select: spotifySesionSelect,
  });
  if (activa) return activa;
  return prisma.spotifySesion.findFirst({
    where: { radioId },
    orderBy: { createdAt: "desc" },
    select: spotifySesionSelect,
  });
}

/**
 * Resuelve o auto-crea una SpotifySesion para un slot DJ con playlist.
 * Sincroniza voces del slot (geminiVoiceId) solo cuando el slot las define.
 * playlistId/playlistNombre devueltos son siempre los del slot.
 */
export async function resolverSesionDj(
  radioId: string,
  slotReferenceId: string,
  playlistIdSlot: string,
  playlistNombreSlot: string,
  voz1GeminiId: string | null,
  voz2GeminiId: string | null,
): Promise<SpotifySesionRow | null> {
  const conexion = await prisma.spotifyConexion.findUnique({ where: { radioId } });
  if (!conexion) return null;

  const spotifyId = normalizePlaylistId(playlistIdSlot);
  const playlistUri = `spotify:playlist:${spotifyId}`;

  const actualizarVoces: { voz1Id?: string; voz2Id?: string } = {};
  if (voz1GeminiId !== null) actualizarVoces.voz1Id = voz1GeminiId;
  if (voz2GeminiId !== null) actualizarVoces.voz2Id = voz2GeminiId;

  const cached = await readDjSlotState(radioId);

  if (cached?.slotId === slotReferenceId) {
    const existente = await prisma.spotifySesion.findFirst({
      where: { id: cached.sesionId, radioId },
      select: spotifySesionSelect,
    });
    if (existente) {
      if (Object.keys(actualizarVoces).length > 0) {
        await prisma.spotifySesion.update({
          where: { id: existente.id },
          data: actualizarVoces,
        });
      }
      return {
        ...existente,
        playlistId: playlistUri,
        playlistNombre: playlistNombreSlot,
      };
    }
  }

  if (cached?.sesionId) {
    await finalizarSesionDj(cached.sesionId, radioId);
  }

  const sesion = await prisma.spotifySesion.create({
    data: {
      radioId,
      conexionId: conexion.id,
      playlistId: playlistUri,
      playlistNombre: playlistNombreSlot,
      voz1Id: voz1GeminiId,
      voz2Id: voz2GeminiId,
      estado: EstadoSesionSpotify.ACTIVA,
    },
    select: spotifySesionSelect,
  });

  await writeDjSlotState(radioId, { slotId: slotReferenceId, sesionId: sesion.id });

  return {
    ...sesion,
    playlistId: playlistUri,
    playlistNombre: playlistNombreSlot,
  };
}

export function toSpotifySesionAire(
  sesion: SpotifySesionRow,
  playlistOverride?: { playlistId: string; playlistNombre: string },
): SpotifySesionAire {
  const playlistId = playlistOverride?.playlistId ?? sesion.playlistId;
  const playlistNombre = playlistOverride?.playlistNombre ?? sesion.playlistNombre;
  return {
    sesionId: sesion.id,
    panelToken: sesion.panelToken,
    playlistId,
    playlistNombre,
  };
}
