import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionRadioId } from "@/lib/session";

const patchSchema = z.object({
  nombre: z.string().min(2).optional(),
  contacto: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
  rubro: z.string().nullable().optional(),
  notas: z.string().nullable().optional(),
  montoMensual: z.number().min(0).nullable().optional(),
  esActivo: z.boolean().optional(),
  texto: z.string().max(4000).nullable().optional(),
  estilo: z.enum(["energetico", "elegante", "humoristico"]).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existente = await prisma.anunciante.findUnique({ where: { id } });
  if (!existente || existente.radioId !== radioId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const data = parsed.data;
  const actualizado = await prisma.anunciante.update({
    where: { id },
    data: {
      ...data,
      ...(data.texto !== undefined ? { texto: data.texto?.trim() || null } : {}),
    },
  });

  return NextResponse.json(actualizado);
}

export async function DELETE(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const existente = await prisma.anunciante.findUnique({
    where: { id },
    select: { id: true, radioId: true },
  });
  if (!existente || existente.radioId !== radioId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.anunciante.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
