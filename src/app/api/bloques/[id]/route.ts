import { rm } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getPreviewDirForBloque } from "@/lib/audio/previewPaths";
import { prisma } from "@/lib/prisma";
import { getBloqueConProgramaRadio } from "@/lib/bloques/auth";
import { getSessionRadioId } from "@/lib/session";

const patchSchema = z.object({
  titulo: z.string().min(1).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  elevenlabsVoiceId: z.string().nullable().optional(),
  elevenlabsVoiceId2: z.string().nullable().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const found = await getBloqueConProgramaRadio(id);
  if (!found || found.radioId !== radioId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const bloque = await prisma.bloque.findUnique({ where: { id } });
  return NextResponse.json(bloque);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const found = await getBloqueConProgramaRadio(id);
  if (!found || found.radioId !== radioId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const actual = found.bloque;
  const configMerged =
    parsed.data.config !== undefined
      ? { ...((actual.config ?? {}) as Record<string, unknown>), ...parsed.data.config }
      : undefined;

  const bloque = await prisma.bloque.update({
    where: { id },
    data: {
      ...(parsed.data.titulo !== undefined ? { titulo: parsed.data.titulo } : {}),
      ...(configMerged !== undefined ? { config: configMerged as Prisma.InputJsonValue } : {}),
      ...(parsed.data.elevenlabsVoiceId !== undefined ? { elevenlabsVoiceId: parsed.data.elevenlabsVoiceId } : {}),
      ...(parsed.data.elevenlabsVoiceId2 !== undefined ? { elevenlabsVoiceId2: parsed.data.elevenlabsVoiceId2 } : {}),
    },
  });

  return NextResponse.json(bloque);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const found = await getBloqueConProgramaRadio(id);
  if (!found || found.radioId !== radioId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.bloque.delete({ where: { id } });

  try {
    await rm(getPreviewDirForBloque(id), { recursive: true, force: true });
  } catch {
    // Directorio ausente u otro error de FS: no bloquea la respuesta
  }

  return NextResponse.json({ ok: true });
}
