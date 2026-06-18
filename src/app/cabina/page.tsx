import { notFound } from "next/navigation";
import { AireController } from "@/components/aire/AireController";
import { prisma } from "@/lib/prisma";
import { buscarSpotifySesionParaAire, toSpotifySesionAire } from "@/lib/spotify/sesionAire";

export default async function CabinaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}): Promise<React.ReactElement> {
  const { token } = await searchParams;
  if (!token) notFound();

  const radio = await prisma.radio.findUnique({
    where: { aireToken: token },
    select: { id: true, nombre: true },
  });
  if (!radio) notFound();

  const sesion = await buscarSpotifySesionParaAire(radio.id);

  return (
    <AireController
      radioId={radio.id}
      radioNombre={radio.nombre}
      aireToken={token}
      spotifySesionActiva={sesion ? toSpotifySesionAire(sesion) : null}
    />
  );
}
