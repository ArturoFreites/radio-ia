import { NextResponse } from "next/server";
import { fetchNoticiasEstructuradas } from "@/lib/noticias/rss";
import { prisma } from "@/lib/prisma";
import { getSessionRadioId } from "@/lib/session";

export async function GET(): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const radio = await prisma.radio.findUnique({
    where: { id: radioId },
    select: { fuentesNoticias: true },
  });
  if (!radio) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (radio.fuentesNoticias.length === 0) {
    return NextResponse.json({ noticias: [] });
  }

  const items = await fetchNoticiasEstructuradas({
    fuentesRSS: radio.fuentesNoticias,
    cantidad: 20,
  });

  return NextResponse.json({
    noticias: items.map((item) => ({
      titulo: item.titulo,
      resumen: item.resumen,
      url: item.url,
      fecha: item.fecha.toISOString(),
      fuente: item.fuente,
    })),
  });
}
