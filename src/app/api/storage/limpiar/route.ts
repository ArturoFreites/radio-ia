import { NextResponse } from "next/server";
import { z } from "zod";
import { limpiarStorage } from "@/lib/audio/storageGestion";
import { getSessionRadioId } from "@/lib/session";
import { STORAGE_CATEGORIA_NOMBRES } from "@/types/storage";
import type { LimpiarResponse } from "@/types/storage";

const limpiarSchema = z.object({
  categorias: z.array(z.enum(STORAGE_CATEGORIA_NOMBRES)).default([]),
});

export async function DELETE(
  request: Request,
): Promise<NextResponse<LimpiarResponse | { error: string }>> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as unknown;
  const parsed = limpiarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const categorias =
    parsed.data.categorias.length === 0 ? [] : parsed.data.categorias.map((c) => c as string);

  const resultado = await limpiarStorage(radioId, categorias);
  return NextResponse.json(resultado);
}
