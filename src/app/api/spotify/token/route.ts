import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccessTokenFresco } from "@/lib/spotify/auth";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sesionId = request.nextUrl.searchParams.get("sesionId");
  const panelToken = request.nextUrl.searchParams.get("token");
  if (!sesionId || !panelToken) {
    return NextResponse.json({ error: "sesionId y token requeridos" }, { status: 400 });
  }

  const sesion = await prisma.spotifySesion.findFirst({
    where: { id: sesionId, panelToken },
    include: { conexion: true },
  });
  if (!sesion) {
    return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 });
  }

  try {
    const accessToken = await getAccessTokenFresco(sesion.conexion);
    return NextResponse.json({ accessToken });
  } catch {
    return NextResponse.json({ error: "No se pudo refrescar el token de Spotify" }, { status: 502 });
  }
}
