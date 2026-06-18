import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generarIntroApertura, introAudioPath } from "@/lib/spotify/generarIntroApertura";
import { getSessionRadioId } from "@/lib/session";

const bodySchema = z.object({
  panelToken: z.string().min(1),
  playlistId: z.string().optional(),
});

async function resolverSesion(
  sesionId: string,
  panelToken: string | undefined,
): Promise<{ id: string; panelToken: string } | null> {
  const radioId = await getSessionRadioId();
  if (radioId) {
    const sesion = await prisma.spotifySesion.findFirst({
      where: { id: sesionId, radioId },
      select: { id: true, panelToken: true },
    });
    if (sesion) return sesion;
  }
  if (panelToken) {
    return prisma.spotifySesion.findFirst({
      where: { id: sesionId, panelToken },
      select: { id: true, panelToken: true },
    });
  }
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: sesionId } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sesion = await resolverSesion(sesionId, parsed.data.panelToken);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const audioUrl = await generarIntroApertura(sesionId, parsed.data.playlistId);
  return NextResponse.json({ audioUrl });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: sesionId } = await params;
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token requerido" }, { status: 400 });
  }

  const sesion = await resolverSesion(sesionId, token);
  if (!sesion || sesion.panelToken !== token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const playlistId = request.nextUrl.searchParams.get("playlistId");
  const path = introAudioPath(sesionId, playlistId);
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
