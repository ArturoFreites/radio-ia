import { access } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { createAudioFileResponse } from "@/lib/audio/serveAudioFile";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programaId: string }> },
): Promise<Response> {
  const { programaId } = await params;
  const token = request.nextUrl.searchParams.get("token");
  const path = request.nextUrl.searchParams.get("path");
  if (!token || !path) return NextResponse.json({ error: "Token y path son requeridos" }, { status: 401 });

  const programa = await prisma.programa.findFirst({
    where: { id: programaId, panelToken: token },
  });
  if (!programa) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await access(path);
  return createAudioFileResponse(path, request);
}
