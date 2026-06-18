import { NextRequest, NextResponse } from "next/server";
import { resolverRadioPorAireToken } from "@/lib/aire/validarToken";
import { publicidadTieneContenido, wherePublicidadAlAire } from "@/lib/publicidad/filtros";
import { prisma } from "@/lib/prisma";
import type { DjInterrupcionPublicidadResponse } from "@/types/grilla";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token");
  const radio = await resolverRadioPorAireToken(token);
  if (!radio) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const items = await prisma.anunciante.findMany({
    where: wherePublicidadAlAire(radio.id),
    select: { id: true, nombre: true, texto: true, audioUrl: true },
    orderBy: { updatedAt: "asc" },
  });

  const body: DjInterrupcionPublicidadResponse = {
    publicidades: items
      .filter((item) => publicidadTieneContenido(item.texto, item.audioUrl))
      .map((item) => ({
        id: item.id,
        nombre: item.nombre,
        tieneAudio: Boolean(item.audioUrl),
        tieneTexto: Boolean(item.texto?.trim()),
      })),
  };
  return NextResponse.json(body);
}
