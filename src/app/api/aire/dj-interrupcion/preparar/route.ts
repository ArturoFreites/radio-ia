import { NextResponse } from "next/server";
import { z } from "zod";
import { generarAudioInterrupcionDj } from "@/lib/aire/djInterrupcionServicio";
import { resolverRadioPorAireToken } from "@/lib/aire/validarToken";

const bodySchema = z.object({
  aireToken: z.string().min(1),
  tipo: z.enum(["HORA", "CLIMA", "PUBLICIDAD"]),
  voiceId: z.string().min(1),
  publicidadId: z.string().min(1).optional(),
  horaObjetivoMs: z.number().int().positive().optional(),
});

export async function POST(request: Request): Promise<Response> {
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

  if (parsed.data.tipo === "PUBLICIDAD" && !parsed.data.publicidadId) {
    return NextResponse.json({ error: "publicidadId requerido para PUBLICIDAD" }, { status: 400 });
  }

  const radio = await resolverRadioPorAireToken(parsed.data.aireToken);
  if (!radio) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const resultado = await generarAudioInterrupcionDj({
    radio,
    tipo: parsed.data.tipo,
    voiceId: parsed.data.voiceId,
    publicidadId: parsed.data.publicidadId,
    horaObjetivoMs: parsed.data.horaObjetivoMs,
  });

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  }

  return new Response(new Uint8Array(resultado.buffer), {
    headers: {
      "Content-Type": resultado.contentType,
      "Cache-Control": "no-store",
    },
  });
}
