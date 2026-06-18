import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generarTextoGemini } from "@/lib/gemini/guiones";
import { buildBusquedaAnunciantePrompt } from "@/lib/gemini/prompts/publicidad";
import { getSessionRadioId } from "@/lib/session";
import { getBloqueConProgramaRadio } from "@/lib/bloques/auth";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const found = await getBloqueConProgramaRadio(id);
  if (!found || found.radioId !== radioId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const config = (found.bloque.config ?? {}) as Record<string, unknown>;
  const nombre = String(config.nombreAnunciante ?? "").trim();
  if (!nombre) {
    return NextResponse.json({ error: "Falta nombreAnunciante en config" }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY no configurada" }, { status: 503 });
  }

  const prompt = buildBusquedaAnunciantePrompt({
    nombreAnunciante: nombre,
    urlAnunciante: typeof config.urlAnunciante === "string" ? config.urlAnunciante : undefined,
  });
  const info = await generarTextoGemini(prompt, radioId);

  await prisma.bloque.update({
    where: { id },
    data: {
      config: {
        ...config,
        nombreAnunciante: nombre,
        infoAnuncianteCache: info,
      },
    },
  });

  return NextResponse.json({ info });
}
