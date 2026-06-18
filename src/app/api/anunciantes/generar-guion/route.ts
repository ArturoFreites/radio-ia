import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generarTextoGemini } from "@/lib/gemini/guiones";
import { buildPublicidadGuionPrompt } from "@/lib/gemini/prompts/publicidad";
import { normalizarGuionParaLocucion } from "@/lib/publicidad/guionLocucion";
import { prisma } from "@/lib/prisma";
import { getSessionRadioId } from "@/lib/session";

const schema = z.object({
  nombre: z.string().min(2).max(120),
  rubro: z.string().max(120).optional(),
  telefono: z.string().max(40).optional(),
  direccion: z.string().max(200).optional(),
  notas: z.string().max(2000).optional(),
  estilo: z.enum(["energetico", "elegante", "humoristico"]).default("energetico"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY no configurada" }, { status: 503 });
  }

  const radio = await prisma.radio.findUnique({
    where: { id: radioId },
    select: { nombre: true, estiloLocucion: true },
  });
  if (!radio) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const data = parsed.data;
  const prompt = buildPublicidadGuionPrompt({
    nombrePrograma: radio.nombre,
    nombre: data.nombre.trim(),
    rubro: data.rubro?.trim(),
    telefono: data.telefono?.trim(),
    direccion: data.direccion?.trim(),
    notas: data.notas?.trim(),
    estilo: data.estilo,
    estiloRadio: radio.estiloLocucion ?? "cálido y cercano",
  });

  const bruto = (await generarTextoGemini(prompt, radioId)).trim();
  const texto = normalizarGuionParaLocucion(bruto);
  if (!texto) {
    return NextResponse.json({ error: "No se pudo generar el guión" }, { status: 502 });
  }

  return NextResponse.json({ texto });
}
