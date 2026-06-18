import { NextResponse } from "next/server";
import { EstadoSesionSpotify } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionRadioId } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const sesion = await prisma.spotifySesion.findFirst({
    where: { id, radioId },
    include: {
      presentaciones: {
        select: { id: true, trackSpotifyId: true, trackNombre: true, estado: true },
      },
    },
  });
  if (!sesion) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  return NextResponse.json(sesion);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const updated = await prisma.spotifySesion.updateMany({
    where: { id, radioId },
    data: { estado: EstadoSesionSpotify.FINALIZADA },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
