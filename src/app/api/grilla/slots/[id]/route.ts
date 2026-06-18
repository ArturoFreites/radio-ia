import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { djInterrupcionesFieldsZ } from "@/lib/grilla/djConfigSchema";
import { horaInicioGrillaZ } from "@/lib/grilla/horaSchema";
import { normalizarPlaylistSlot } from "@/lib/grilla/playlistSlot";
import { validarVocesSlotParaRadio } from "@/lib/grilla/vocesSlot";
import { getSessionRadioId } from "@/lib/session";

const grillaVozInclude = {
  voz1: { select: { id: true, nombre: true } },
  voz2: { select: { id: true, nombre: true } },
} as const;

const patchSlotSchema = z
  .object({
    diaDeSemana: z.number().int().min(0).max(6).optional(),
    horaInicio: horaInicioGrillaZ.optional(),
    duracionMin: z.number().int().min(5).optional(),
    playlistId: z.string().nullable().optional(),
    playlistNombre: z.string().nullable().optional(),
    voz1Id: z.string().cuid().nullable().optional(),
    voz2Id: z.string().cuid().nullable().optional(),
  })
  .merge(djInterrupcionesFieldsZ);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const body: unknown = await request.json();
  const parsed = patchSlotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const raw = parsed.data;

  const slot = await prisma.slotGrilla.findFirst({ where: { id, radioId } });
  if (!slot) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (raw.diaDeSemana !== undefined) patch.diaDeSemana = raw.diaDeSemana;
  if (raw.horaInicio !== undefined) patch.horaInicio = raw.horaInicio;
  if (raw.duracionMin !== undefined) patch.duracionMin = raw.duracionMin;
  if (raw.presentacionCadaTemas !== undefined) patch.presentacionCadaTemas = raw.presentacionCadaTemas;

  if (raw.djHoraActiva !== undefined) {
    patch.djHoraActiva = raw.djHoraActiva;
    patch.djHoraIntervaloMin = raw.djHoraActiva ? (raw.djHoraIntervaloMin ?? slot.djHoraIntervaloMin) : null;
  } else if (raw.djHoraIntervaloMin !== undefined) {
    patch.djHoraIntervaloMin = raw.djHoraIntervaloMin;
  }

  if (raw.djClimaActivo !== undefined) {
    patch.djClimaActivo = raw.djClimaActivo;
    patch.djClimaIntervaloMin = raw.djClimaActivo ? (raw.djClimaIntervaloMin ?? slot.djClimaIntervaloMin) : null;
  } else if (raw.djClimaIntervaloMin !== undefined) {
    patch.djClimaIntervaloMin = raw.djClimaIntervaloMin;
  }

  if (raw.djPublicidadActiva !== undefined) {
    patch.djPublicidadActiva = raw.djPublicidadActiva;
    patch.djPublicidadIntervaloMin = raw.djPublicidadActiva
      ? (raw.djPublicidadIntervaloMin ?? slot.djPublicidadIntervaloMin)
      : null;
  } else if (raw.djPublicidadIntervaloMin !== undefined) {
    patch.djPublicidadIntervaloMin = raw.djPublicidadIntervaloMin;
  }

  if (raw.playlistId !== undefined || raw.playlistNombre !== undefined) {
    const merged = normalizarPlaylistSlot(
      raw.playlistId !== undefined ? raw.playlistId : slot.playlistId,
      raw.playlistNombre !== undefined ? raw.playlistNombre : slot.playlistNombre,
    );
    patch.playlistId = merged.playlistId;
    patch.playlistNombre = merged.playlistNombre;
  }

  if (raw.voz1Id !== undefined || raw.voz2Id !== undefined) {
    const vocesValidadas = await validarVocesSlotParaRadio(
      radioId,
      raw.voz1Id !== undefined ? raw.voz1Id : slot.voz1Id,
      raw.voz2Id !== undefined ? raw.voz2Id : slot.voz2Id,
    );
    if ("error" in vocesValidadas) {
      return NextResponse.json({ error: vocesValidadas.error }, { status: 400 });
    }
    if (raw.voz1Id !== undefined) patch.voz1Id = vocesValidadas.voz1Id;
    if (raw.voz2Id !== undefined) patch.voz2Id = vocesValidadas.voz2Id;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
  }

  const updated = await prisma.slotGrilla.update({
    where: { id },
    data: patch,
    include: grillaVozInclude,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const slot = await prisma.slotGrilla.findFirst({ where: { id, radioId } });
  if (!slot) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  await prisma.slotGrilla.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
