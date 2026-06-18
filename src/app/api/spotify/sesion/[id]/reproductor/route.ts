import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAccessTokenFresco } from "@/lib/spotify/auth";
import { fetchPlayerQueue, fetchPlayerState, playerControl } from "@/lib/spotify/playerApi";
import { prisma } from "@/lib/prisma";

const actionSchema = z.object({
  token: z.string().min(1),
  action: z.enum(["play", "pause", "next", "previous"]),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: sesionId } = await params;
  const panelToken = request.nextUrl.searchParams.get("token");
  if (!panelToken) {
    return NextResponse.json({ error: "token requerido" }, { status: 400 });
  }

  const sesion = await prisma.spotifySesion.findFirst({
    where: { id: sesionId, panelToken },
    include: { conexion: true },
  });
  if (!sesion) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  try {
    const accessToken = await getAccessTokenFresco(sesion.conexion);
    const [state, queue] = await Promise.all([
      fetchPlayerState(accessToken),
      fetchPlayerQueue(accessToken),
    ]);
    const nextTrack = queue?.queue[0] ?? null;
    return NextResponse.json({
      isPlaying: state?.is_playing ?? false,
      progressMs: state?.progress_ms ?? 0,
      current: state?.item
        ? {
            name: state.item.name,
            artist: state.item.artists.map((a) => a.name).join(", "),
            imageUrl: state.item.album.images[0]?.url ?? null,
            durationMs: state.item.duration_ms,
          }
        : null,
      next: nextTrack
        ? {
            name: nextTrack.name,
            artist: nextTrack.artists.map((a) => a.name).join(", "),
            imageUrl: nextTrack.album.images[0]?.url ?? null,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar Spotify" }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: sesionId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const sesion = await prisma.spotifySesion.findFirst({
    where: { id: sesionId, panelToken: parsed.data.token },
    include: { conexion: true },
  });
  if (!sesion) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  try {
    const accessToken = await getAccessTokenFresco(sesion.conexion);
    await playerControl(accessToken, parsed.data.action);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo controlar la reproducción" }, { status: 502 });
  }
}
