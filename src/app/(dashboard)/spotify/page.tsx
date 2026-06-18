import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SpotifyOAuthPanel } from "@/components/spotify/SpotifyOAuthPanel";
import { SpotifySetup } from "@/components/spotify/SpotifySetup";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SpotifyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}): Promise<React.ReactElement> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.radioId) {
    redirect("/login");
  }
  const radioId = session.user.radioId;
  const sp = await searchParams;

  const conexion = await prisma.spotifyConexion.findUnique({ where: { radioId } });

  const sesiones =
    conexion ?
      await prisma.spotifySesion.findMany({
        where: { radioId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          playlistNombre: true,
          estado: true,
          panelToken: true,
          createdAt: true,
        },
      })
    : [];

  const alerta = sp.error ? decodeURIComponent(sp.error) : null;
  const exito = sp.connected === "1";

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <BrandLogo brand="spotify" size="xl" />
        <div>
          <h1 className="text-2xl font-bold text-white">Spotify</h1>
          <p className="mt-1 text-zinc-400">Conexión OAuth para los slots DJ de la grilla y la página de aire.</p>
        </div>
      </div>
      <SpotifyOAuthPanel conectado={Boolean(conexion)} alerta={alerta} exito={exito} />
      {conexion ?
        <div className="mt-8">
          <SpotifySetup
            conectado
            sesiones={sesiones.map((s) => ({
              id: s.id,
              playlistNombre: s.playlistNombre,
              estado: s.estado,
              panelToken: s.panelToken,
              createdAt: s.createdAt.toISOString(),
            }))}
            alerta={alerta}
            exito={exito}
          />
        </div>
      : null}
    </div>
  );
}
