import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function filePathFor(presentacionId: string): string {
  const base = process.env.AUDIO_STORAGE_PATH ?? "/app/storage/audio";
  return join(base, "spotify", `${presentacionId}.mp3`);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ presentacionId: string }> },
): Promise<Response> {
  const { presentacionId } = await params;
  const sesionId = request.nextUrl.searchParams.get("sesionId");
  const token = request.nextUrl.searchParams.get("token");
  if (!sesionId || !token) {
    return NextResponse.json({ error: "sesionId y token requeridos" }, { status: 400 });
  }

  const presentacion = await prisma.presentacionTrack.findFirst({
    where: { id: presentacionId, sesionId },
    include: { sesion: { select: { panelToken: true } } },
  });
  if (!presentacion || presentacion.sesion.panelToken !== token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const path = filePathFor(presentacionId);
  try {
    await access(path);
  } catch {
    return NextResponse.json({ error: "Audio no disponible" }, { status: 404 });
  }

  const stream = createReadStream(path);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache",
    },
  });
}
