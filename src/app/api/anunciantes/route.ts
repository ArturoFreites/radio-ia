import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionRadioId } from "@/lib/session";
import { publicidadTieneContenido, wherePublicidadAlAire } from "@/lib/publicidad/filtros";

const schema = z.object({
  nombre: z.string().min(2),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().optional(),
  direccion: z.string().optional(),
  rubro: z.string().optional(),
  notas: z.string().optional(),
  montoMensual: z.number().min(0).optional(),
  texto: z.string().max(4000).optional(),
  estilo: z.enum(["energetico", "elegante", "humoristico"]).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const soloResumen = request.nextUrl.searchParams.get("resumen") === "1";
  const soloConAudio = request.nextUrl.searchParams.get("conAudio") === "1";

  if (soloResumen) {
    const items = await prisma.anunciante.findMany({
      where: wherePublicidadAlAire(radioId),
      select: { texto: true, audioUrl: true },
    });
    const activas = items.filter((item) => publicidadTieneContenido(item.texto, item.audioUrl)).length;
    return NextResponse.json({ activas });
  }

  if (soloConAudio) {
    const items = await prisma.anunciante.findMany({
      where: {
        radioId,
        esActivo: true,
        audioUrl: { not: null },
      },
      select: {
        id: true,
        nombre: true,
        texto: true,
        duracion: true,
        audioUrl: true,
      },
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json({
      publicidades: items.map((item) => ({
        id: item.id,
        nombre: item.nombre,
        texto: item.texto,
        duracion: item.duracion,
        audioUrl: item.audioUrl,
      })),
    });
  }

  const anunciantes = await prisma.anunciante.findMany({
    where: { radioId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(anunciantes);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { texto, estilo, ...rest } = parsed.data;
  const anunciante = await prisma.anunciante.create({
    data: {
      ...rest,
      radioId,
      texto: texto?.trim() || null,
      estilo: estilo ?? "energetico",
    },
  });
  return NextResponse.json(anunciante, { status: 201 });
}
