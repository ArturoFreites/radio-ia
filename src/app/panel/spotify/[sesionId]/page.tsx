import { notFound } from "next/navigation";
import { EstadoSesionSpotify } from "@prisma/client";
import { SpotifyPanel } from "@/components/spotify/SpotifyPanel";
import { prisma } from "@/lib/prisma";

export default async function SpotifyPanelPage({
  params,
  searchParams,
}: {
  params: Promise<{ sesionId: string }>;
  searchParams: Promise<{ token?: string }>;
}): Promise<React.ReactElement> {
  const { sesionId } = await params;
  const { token } = await searchParams;
  if (!token) return notFound();

  const sesion = await prisma.spotifySesion.findFirst({
    where: { id: sesionId, panelToken: token, estado: EstadoSesionSpotify.ACTIVA },
    include: { radio: { select: { nombre: true } } },
  });
  if (!sesion) return notFound();

  return (
    <SpotifyPanel
      sesionId={sesion.id}
      panelToken={sesion.panelToken}
      playlistId={sesion.playlistId}
      playlistNombre={sesion.playlistNombre}
      radioNombre={sesion.radio.nombre}
    />
  );
}
