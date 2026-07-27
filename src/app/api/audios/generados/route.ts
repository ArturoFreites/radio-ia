import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  listarAudiosGenerados,
  TIPOS_AUDIO_GENERADO,
} from "@/lib/audios/catalogoGenerados";
import { getSessionRadioId } from "@/lib/session";

const querySchema = z.object({
  tipo: z.enum(TIPOS_AUDIO_GENERADO).optional(),
  q: z.string().trim().max(120).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    tipo: request.nextUrl.searchParams.get("tipo") ?? undefined,
    q: request.nextUrl.searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const items = await listarAudiosGenerados(radioId, {
    tipo: parsed.data.tipo,
    q: parsed.data.q,
  });

  return NextResponse.json({ items });
}
