import { notFound } from "next/navigation";
import { PanelOBS } from "@/components/panel/PanelOBS";
import { prisma } from "@/lib/prisma";

export default async function PanelPage({
  params,
  searchParams,
}: {
  params: Promise<{ programaId: string }>;
  searchParams: Promise<{ token?: string }>;
}): Promise<React.ReactElement> {
  const { programaId } = await params;
  const { token } = await searchParams;
  if (!token) return notFound();

  const programa = await prisma.programa.findFirst({
    where: { id: programaId, panelToken: token },
    include: { bloques: { orderBy: { orden: "asc" } } },
  });
  if (!programa) return notFound();

  return (
    <PanelOBS
      programaId={programaId}
      token={token}
      bloques={programa.bloques.map((bloque) => ({
        id: bloque.id,
        titulo: bloque.titulo,
        audioUrl: bloque.audioUrl,
        duracion: bloque.duracion,
      }))}
    />
  );
}
