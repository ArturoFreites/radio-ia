import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionRadioId } from "@/lib/session";

const postCarpetaSchema = z.object({
  nombre: z.string().trim().min(1).max(80),
  modoRotacion: z.enum(["SECUENCIAL", "ALEATORIO"]).optional(),
});

export async function GET(): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const carpetas = await prisma.audioCarpeta.findMany({
    where: { radioId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { archivos: { where: { esActivo: true } } } },
    },
  });

  return NextResponse.json(
    carpetas.map((c) => ({
      id: c.id,
      radioId: c.radioId,
      nombre: c.nombre,
      modoRotacion: c.modoRotacion,
      esActiva: c.esActiva,
      archivosCount: c._count.archivos,
    })),
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body: unknown = await request.json();
  const parsed = postCarpetaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const carpeta = await prisma.audioCarpeta.create({
    data: {
      radioId,
      nombre: parsed.data.nombre,
      modoRotacion: parsed.data.modoRotacion ?? "SECUENCIAL",
    },
  });

  return NextResponse.json(
    {
      id: carpeta.id,
      radioId: carpeta.radioId,
      nombre: carpeta.nombre,
      modoRotacion: carpeta.modoRotacion,
      esActiva: carpeta.esActiva,
      archivosCount: 0,
    },
    { status: 201 },
  );
}
