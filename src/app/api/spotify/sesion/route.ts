import { NextResponse } from "next/server";
import { z } from "zod";
import { getSpotifyPresentacionQueue } from "@/lib/queue/jobs";
import { prisma } from "@/lib/prisma";
import { getSessionRadioId } from "@/lib/session";
import { fetchPlaylistTracksFirstPage, normalizePlaylistId } from "@/lib/spotify/api";
import { getAccessTokenFresco } from "@/lib/spotify/auth";

export async function GET(): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sesiones = await prisma.spotifySesion.findMany({
    where: { radioId },
    select: { id: true, playlistNombre: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sesiones);
}

const bodySchema = z.object({
  playlistId: z.string().min(3),
  playlistNombre: z.string().min(1).max(200),
  voz1Id: z.string().min(3).max(120),
  voz2Id: z.string().min(3).max(120),
});

export async function POST(request: Request): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const conexion = await prisma.spotifyConexion.findUnique({ where: { radioId } });
  if (!conexion) {
    return NextResponse.json({ error: "Conectá Spotify primero" }, { status: 400 });
  }

  const playlistSpotifyId = normalizePlaylistId(parsed.data.playlistId);
  const playlistUri = `spotify:playlist:${playlistSpotifyId}`;

  let tracks;
  try {
    const accessToken = await getAccessTokenFresco(conexion);
    tracks = await fetchPlaylistTracksFirstPage(accessToken, playlistSpotifyId, {
      market: process.env.SPOTIFY_PLAYLIST_MARKET?.trim() || "from_token",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const truncated = detail.length > 800 ? `${detail.slice(0, 800)}…` : detail;
    const spotify403 = /Spotify HTTP 403/i.test(detail);
    console.error("[spotify/sesion]", truncated);
    if (spotify403) {
      return NextResponse.json(
        {
          error:
            "Spotify no permite leer los temas de esta playlist desde la app: solo si sos el dueño o colaborador (no alcanza con seguirla). Creá una playlist tuya y agregá los temas, o elegí una lista donde aparezcas como colaborador.",
          detail: truncated,
        },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: "No se pudo cargar la playlist", detail: truncated }, { status: 502 });
  }

  if (tracks.length === 0) {
    return NextResponse.json(
      {
        error:
          "La playlist no devolvió temas reproducibles (mercado, episodios solo, archivos locales o permisos). Probá otra lista.",
      },
      { status: 422 },
    );
  }

  const sesion = await prisma.spotifySesion.create({
    data: {
      radioId,
      conexionId: conexion.id,
      playlistId: playlistUri,
      playlistNombre: parsed.data.playlistNombre,
      voz1Id: parsed.data.voz1Id,
      voz2Id: parsed.data.voz2Id,
    },
  });

  for (const t of tracks) {
    const artista = (t.artists ?? []).map((a) => a.name).filter(Boolean).join(", ") || "Artista";
    const cover = t.album?.images?.[0]?.url ?? null;
    const albumNombre = t.album?.name ?? "—";
    await prisma.presentacionTrack.upsert({
      where: {
        sesionId_trackSpotifyId: { sesionId: sesion.id, trackSpotifyId: t.id },
      },
      create: {
        sesionId: sesion.id,
        trackSpotifyId: t.id,
        trackNombre: t.name,
        artistaNombre: artista,
        albumNombre,
        duracionMs: t.duration_ms,
        coverUrl: cover,
      },
      update: {
        trackNombre: t.name,
        artistaNombre: artista,
        albumNombre,
        duracionMs: t.duration_ms,
        coverUrl: cover,
      },
    });
  }

  const presentaciones = await prisma.presentacionTrack.findMany({
    where: { sesionId: sesion.id },
    orderBy: { createdAt: "asc" },
    take: 1,
  });

  const queue = getSpotifyPresentacionQueue();
  for (const p of presentaciones) {
    await queue.add(
      "generarPresentacion",
      { presentacionId: p.id },
      { jobId: `spotify-pres-${p.id}`, removeOnComplete: true },
    );
  }

  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
  const panelUrl = `${base}/panel/spotify/${sesion.id}?token=${encodeURIComponent(sesion.panelToken)}`;

  return NextResponse.json({ sesionId: sesion.id, panelUrl });
}
