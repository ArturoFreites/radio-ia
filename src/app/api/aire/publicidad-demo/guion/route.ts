import { NextResponse } from "next/server";
import { z } from "zod";
import { resolverRadioPorAireToken } from "@/lib/aire/validarToken";
import { generarTextoGemini } from "@/lib/gemini/guiones";
import { buildPublicidadPrompt } from "@/lib/gemini/prompts/publicidad";
import { normalizarGuionParaLocucion } from "@/lib/publicidad/guionLocucion";

const bodySchema = z.object({
  aireToken: z.string().min(1),
  negocio: z.string().min(1).max(500),
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

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY no configurada" }, { status: 503 });
  }

  const negocio = parsed.data.negocio.trim();
  const prompt = buildPublicidadPrompt({
    nombreAnunciante: negocio,
    infoAnunciante: negocio,
    duracionObjetivo: 20,
    estiloRadio: radio.estiloLocucion ?? "cálido y cercano",
  });

  try {
    const bruto = (await generarTextoGemini(prompt, radio.id)).trim();
    const guion = normalizarGuionParaLocucion(bruto);
    if (!guion) {
      return NextResponse.json({ error: "No se pudo generar el guión" }, { status: 502 });
    }
    return NextResponse.json({ guion } satisfies { guion: string });
  } catch {
    return NextResponse.json({ error: "No se pudo generar el guión" }, { status: 502 });
  }
}
