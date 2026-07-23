import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { DjInterrupcionAudiosResponse } from "@/types/grilla";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token");
  const carpetaId = request.nextUrl.searchParams.get("carpetaId");
  if (!token || !carpetaId) {
    return NextResponse.json({ error: "token y carpetaId requeridos" }, { status: 400 });
  }

  const radio = await prisma.radio.findUnique({
    where: { aireToken: token },
    select: { id: true },
  });
  if (!radio) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const carpeta = await prisma.audioCarpeta.findFirst({
    where: { id: carpetaId, radioId: radio.id, esActiva: true },
    select: {
      nombre: true,
      modoRotacion: true,
      archivos: {
        where: { esActivo: true },
        orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
        select: { id: true, nombre: true, duracionSec: true },
      },
    },
  });

  if (!carpeta) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body: DjInterrupcionAudiosResponse = {
    archivos: carpeta.archivos,
    modoRotacion: carpeta.modoRotacion,
    carpetaNombre: carpeta.nombre,
  };

  return NextResponse.json(body);
}
