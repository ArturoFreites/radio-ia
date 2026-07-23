import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eliminarArchivoBiblioteca } from "@/lib/audios/storage";
import { prisma } from "@/lib/prisma";
import { getSessionRadioId } from "@/lib/session";

const patchArchivoSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  orden: z.number().int().min(0).optional(),
  esActivo: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const body: unknown = await request.json();
  const parsed = patchArchivoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.audioArchivo.findFirst({
    where: { id, carpeta: { radioId } },
  });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const data = parsed.data;
  if (data.nombre === undefined && data.orden === undefined && data.esActivo === undefined) {
    return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
  }

  const updated = await prisma.audioArchivo.update({
    where: { id },
    data: {
      ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
      ...(data.orden !== undefined ? { orden: data.orden } : {}),
      ...(data.esActivo !== undefined ? { esActivo: data.esActivo } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.audioArchivo.findFirst({
    where: { id, carpeta: { radioId } },
  });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.audioArchivo.delete({ where: { id } });
  await eliminarArchivoBiblioteca(existing.audioUrl);

  return NextResponse.json({ ok: true });
}
