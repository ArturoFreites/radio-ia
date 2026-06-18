import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolverRadioPorAireToken } from "@/lib/aire/validarToken";

export type VocesPublicidadDemoResponse = {
  voces: Array<{
    voiceId: string;
    nombre: string;
    nombreAlAire: string | null;
    genero: string;
  }>;
};

export async function GET(request: NextRequest): Promise<NextResponse<VocesPublicidadDemoResponse | { error: string }>> {
  const token = request.nextUrl.searchParams.get("token");
  const radio = await resolverRadioPorAireToken(token);
  if (!radio) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const asignadas = await prisma.radioVoz.findMany({
    where: { radioId: radio.id, voz: { esActiva: true } },
    include: { voz: { select: { nombre: true, genero: true, geminiVoiceId: true } } },
    orderBy: { voz: { nombre: "asc" } },
  });

  const body: VocesPublicidadDemoResponse = {
    voces: asignadas.map((rv) => ({
      voiceId: rv.voz.geminiVoiceId,
      nombre: rv.voz.nombre,
      nombreAlAire: rv.nombreAlAire,
      genero: rv.voz.genero,
    })),
  };

  return NextResponse.json(body);
}
