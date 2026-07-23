import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eliminarCarpetaBibliotecaDisco } from "@/lib/audios/storage";
import { prisma } from "@/lib/prisma";
import { getSessionRadioId } from "@/lib/session";

const patchCarpetaSchema = z.object({
  nombre: z.string().trim().min(1).max(80).optional(),
  modoRotacion: z.enum(["SECUENCIAL", "ALEATORIO"]).optional(),
  esActiva: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const body: unknown = await request.json();
  const parsed = patchCarpetaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.audioCarpeta.findFirst({ where: { id, radioId } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const data = parsed.data;
  if (data.nombre === undefined && data.modoRotacion === undefined && data.esActiva === undefined) {
    return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
  }

  const updated = await prisma.audioCarpeta.update({
    where: { id },
    data: {
      ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
      ...(data.modoRotacion !== undefined ? { modoRotacion: data.modoRotacion } : {}),
      ...(data.esActiva !== undefined ? { esActiva: data.esActiva } : {}),
    },
    include: {
      _count: { select: { archivos: { where: { esActivo: true } } } },
    },
  });

  return NextResponse.json({
    id: updated.id,
    radioId: updated.radioId,
    nombre: updated.nombre,
    modoRotacion: updated.modoRotacion,
    esActiva: updated.esActiva,
    archivosCount: updated._count.archivos,
  });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.audioCarpeta.findFirst({ where: { id, radioId } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.audioCarpeta.delete({ where: { id } });
  await eliminarCarpetaBibliotecaDisco(radioId, id);

  return NextResponse.json({ ok: true });
}
