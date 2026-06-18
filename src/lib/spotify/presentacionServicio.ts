import { access } from "node:fs/promises";
import { join } from "node:path";
import { EstadoPresentacion, type PresentacionTrack, type SpotifySesion } from "@prisma/client";
import { getAudioStorageRoot } from "@/lib/audio/previewPaths";
import { getSpotifyPresentacionQueue } from "@/lib/queue/jobs";
import { prisma } from "@/lib/prisma";

const MAX_PRESENTACION_RETRIES = 2;

export type TrackPresentacionMeta = {
  trackSpotifyId: string;
  trackNombre: string;
  artistaNombre: string;
  albumNombre: string;
  duracionMs: number;
  coverUrl: string | null;
};

export type PresentacionEstadoResult = {
  estado: "LISTA" | "GENERANDO" | "ERROR";
  audioPath: string | null;
  presentacionId: string;
};

export function presentacionFilesystemPath(presentacionId: string): string {
  return join(getAudioStorageRoot(), "spotify", `${presentacionId}.mp3`);
}

async function archivoPresentacionExiste(presentacionId: string): Promise<boolean> {
  try {
    await access(presentacionFilesystemPath(presentacionId));
    return true;
  } catch {
    return false;
  }
}

async function encolarGeneracion(presentacionId: string): Promise<void> {
  const queue = getSpotifyPresentacionQueue();
  await queue.add(
    "generarPresentacion",
    { presentacionId },
    { jobId: `spotify-pres-${presentacionId}`, removeOnComplete: true },
  );
}

async function resolverEstadoPresentacion(
  presentacion: PresentacionTrack,
  sesion: SpotifySesion,
): Promise<PresentacionEstadoResult> {
  const base = { presentacionId: presentacion.id };

  if (presentacion.estado === EstadoPresentacion.LISTA) {
    const path = (await archivoPresentacionExiste(presentacion.id))
      ? presentacionFilesystemPath(presentacion.id)
      : null;
    return { ...base, estado: "LISTA", audioPath: path };
  }

  if (presentacion.estado === EstadoPresentacion.GENERANDO) {
    return { ...base, estado: "GENERANDO", audioPath: null };
  }

  if (presentacion.estado === EstadoPresentacion.ERROR) {
    if (presentacion.retries >= MAX_PRESENTACION_RETRIES) {
      return { ...base, estado: "ERROR", audioPath: null };
    }
    presentacion = await prisma.presentacionTrack.update({
      where: { id: presentacion.id },
      data: {
        estado: EstadoPresentacion.PENDIENTE,
        errorLog: null,
        retries: { increment: 1 },
      },
    });
  }

  if (!sesion.voz1Id) {
    await prisma.presentacionTrack.update({
      where: { id: presentacion.id },
      data: { estado: EstadoPresentacion.LISTA },
    });
    return { ...base, estado: "LISTA", audioPath: null };
  }

  await encolarGeneracion(presentacion.id);
  return { ...base, estado: "GENERANDO", audioPath: null };
}

export async function solicitarOConsultarPresentacion(
  sesionId: string,
  meta: TrackPresentacionMeta,
): Promise<PresentacionEstadoResult> {
  const sesion = await prisma.spotifySesion.findUnique({ where: { id: sesionId } });
  if (!sesion) {
    return { presentacionId: "", estado: "ERROR", audioPath: null };
  }

  const trackKey = {
    sesionId_trackSpotifyId: {
      sesionId,
      trackSpotifyId: meta.trackSpotifyId,
    },
  };

  let presentacion = await prisma.presentacionTrack.findUnique({ where: trackKey });

  if (!presentacion) {
    presentacion = await prisma.presentacionTrack.create({
      data: {
        sesionId,
        trackSpotifyId: meta.trackSpotifyId,
        trackNombre: meta.trackNombre,
        artistaNombre: meta.artistaNombre,
        albumNombre: meta.albumNombre,
        duracionMs: meta.duracionMs,
        coverUrl: meta.coverUrl,
      },
    });
  }

  return resolverEstadoPresentacion(presentacion, sesion);
}

export async function esperarAudioPresentacion(
  sesionId: string,
  trackSpotifyId: string,
  timeoutMs: number,
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const presentacion = await prisma.presentacionTrack.findUnique({
      where: {
        sesionId_trackSpotifyId: { sesionId, trackSpotifyId },
      },
    });
    if (!presentacion) {
      await sleep(800);
      continue;
    }
    if (presentacion.estado === EstadoPresentacion.ERROR) {
      return null;
    }
    if (presentacion.estado === EstadoPresentacion.LISTA) {
      const sesion = await prisma.spotifySesion.findUnique({ where: { id: sesionId } });
      if (!sesion?.voz1Id) return null;
      if (await archivoPresentacionExiste(presentacion.id)) {
        return presentacionFilesystemPath(presentacion.id);
      }
      return null;
    }
    await sleep(800);
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
