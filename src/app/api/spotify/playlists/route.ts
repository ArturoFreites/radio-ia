import { NextResponse } from "next/server";
import { fetchUserPlaylists } from "@/lib/spotify/api";
import { getAccessTokenFresco } from "@/lib/spotify/auth";
import { prisma } from "@/lib/prisma";
import { getSessionRadioId } from "@/lib/session";

export async function GET(): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const conexion = await prisma.spotifyConexion.findUnique({ where: { radioId } });
  if (!conexion) {
    return NextResponse.json({ error: "Spotify no conectado" }, { status: 400 });
  }

  try {
    const accessToken = await getAccessTokenFresco(conexion);
    const playlists = await fetchUserPlaylists(accessToken, conexion.spotifyUserId);
    return NextResponse.json(playlists);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[spotify/playlists]", detail);
    return NextResponse.json({ error: "Error al listar playlists", detail }, { status: 502 });
  }
}
