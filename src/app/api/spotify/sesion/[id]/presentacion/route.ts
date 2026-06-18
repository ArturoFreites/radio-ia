import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  solicitarOConsultarPresentacion,
  type PresentacionEstadoResult,
} from "@/lib/spotify/presentacionServicio";
import { getSessionRadioId } from "@/lib/session";

const bodySchema = z.object({
  trackSpotifyId: z.string().min(1),
  panelToken: z.string().optional(),
  trackNombre: z.string().optional(),
  artistaNombre: z.string().optional(),
  albumNombre: z.string().optional(),
  duracionMs: z.number().int().nonnegative().optional(),
  coverUrl: z.string().nullable().optional(),
});

const querySchema = z.object({
  trackSpotifyId: z.string().min(1),
  token: z.string().min(1),
});

type PresentacionResponse = {
  estado: "LISTA" | "GENERANDO" | "ERROR";
  audioUrl?: string;
};

async function resolverSesion(
  sesionId: string,
  opts: { radioId: string | null; panelToken?: string },
): Promise<{ id: string } | null> {
  if (opts.radioId) {
    const porRadio = await prisma.spotifySesion.findFirst({
      where: { id: sesionId, radioId: opts.radioId },
      select: { id: true },
    });
    if (porRadio) return porRadio;
  }
  if (opts.panelToken) {
    return prisma.spotifySesion.findFirst({
      where: { id: sesionId, panelToken: opts.panelToken },
      select: { id: true },
    });
  }
  return null;
}

function toHttpResponse(
  sesionId: string,
  panelToken: string,
  result: PresentacionEstadoResult,
): NextResponse<PresentacionResponse> {
  if (result.estado === "LISTA" && result.audioPath && result.presentacionId) {
    const q = new URLSearchParams({ sesionId, token: panelToken });
    return NextResponse.json({
      estado: "LISTA",
      audioUrl: `/api/audio/spotify/${result.presentacionId}?${q.toString()}`,
    });
  }
  if (result.estado === "LISTA") {
    return NextResponse.json({ estado: "LISTA" });
  }
  return NextResponse.json({ estado: result.estado });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: sesionId } = await params;
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    trackSpotifyId: url.searchParams.get("trackSpotifyId"),
    token: url.searchParams.get("token"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sesion = await resolverSesion(sesionId, { radioId: null, panelToken: parsed.data.token });
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sesionFull = await prisma.spotifySesion.findUnique({
    where: { id: sesionId },
    select: { panelToken: true },
  });
  if (!sesionFull) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const presentacion = await prisma.presentacionTrack.findUnique({
    where: {
      sesionId_trackSpotifyId: {
        sesionId,
        trackSpotifyId: parsed.data.trackSpotifyId,
      },
    },
  });

  if (!presentacion) {
    return NextResponse.json({ estado: "GENERANDO" satisfies PresentacionResponse["estado"] });
  }

  const result = await solicitarOConsultarPresentacion(sesionId, {
    trackSpotifyId: presentacion.trackSpotifyId,
    trackNombre: presentacion.trackNombre,
    artistaNombre: presentacion.artistaNombre,
    albumNombre: presentacion.albumNombre,
    duracionMs: presentacion.duracionMs,
    coverUrl: presentacion.coverUrl,
  });

  return toHttpResponse(sesionId, sesionFull.panelToken, result);
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

  const radioId = await getSessionRadioId();
  const sesion = await resolverSesion(sesionId, {
    radioId,
    panelToken: parsed.data.panelToken,
  });
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sesionFull = await prisma.spotifySesion.findUnique({
    where: { id: sesionId },
    select: { panelToken: true },
  });
  if (!sesionFull) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const { trackSpotifyId, trackNombre, artistaNombre, albumNombre, duracionMs, coverUrl } = parsed.data;

  const result = await solicitarOConsultarPresentacion(sesionId, {
    trackSpotifyId,
    trackNombre: trackNombre ?? "Sin título",
    artistaNombre: artistaNombre ?? "",
    albumNombre: albumNombre ?? "",
    duracionMs: duracionMs ?? 0,
    coverUrl: coverUrl ?? null,
  });

  return toHttpResponse(sesionId, sesionFull.panelToken, result);
}
