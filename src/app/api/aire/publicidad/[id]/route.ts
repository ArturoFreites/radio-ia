import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token requerido" }, { status: 400 });
  }

  const radio = await prisma.radio.findUnique({ where: { aireToken: token }, select: { id: true } });
  if (!radio) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const publicidad = await prisma.anunciante.findFirst({
    where: {
      id,
      esActivo: true,
      radioId: radio.id,
    },
    select: { audioUrl: true },
  });
  if (!publicidad?.audioUrl) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  try {
    await access(publicidad.audioUrl);
  } catch {
    return NextResponse.json({ error: "Audio no disponible" }, { status: 404 });
  }

  const stream = createReadStream(publicidad.audioUrl);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache",
    },
  });
}
