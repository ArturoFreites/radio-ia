import { NextResponse } from "next/server";
import { z } from "zod";
import { generarGuionInterrupcionDj } from "@/lib/aire/djInterrupcionServicio";
import { resolverRadioPorAireToken } from "@/lib/aire/validarToken";
import type { DjInterrupcionGuionResponse } from "@/types/grilla";

const bodySchema = z.object({
  aireToken: z.string().min(1),
  tipo: z.enum(["HORA", "CLIMA", "PUBLICIDAD"]),
  publicidadId: z.string().min(1).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const radio = await resolverRadioPorAireToken(parsed.data.aireToken);
  if (!radio) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (!process.env.GEMINI_API_KEY && parsed.data.tipo !== "PUBLICIDAD") {
    return NextResponse.json({ error: "GEMINI_API_KEY no configurada" }, { status: 503 });
  }

  if (parsed.data.tipo === "PUBLICIDAD" && !parsed.data.publicidadId) {
    return NextResponse.json({ error: "publicidadId requerido para PUBLICIDAD" }, { status: 400 });
  }

  try {
    const guion = await generarGuionInterrupcionDj(radio, parsed.data.tipo, parsed.data.publicidadId);
    if (!guion) {
      return NextResponse.json({ error: "No se pudo obtener el guión" }, { status: 502 });
    }
    return NextResponse.json({ guion } satisfies DjInterrupcionGuionResponse);
  } catch {
    return NextResponse.json({ error: "No se pudo obtener el guión" }, { status: 502 });
  }
}
