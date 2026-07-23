import { getServerSession } from "next-auth";
import { AudiosBiblioteca } from "@/components/audios/AudiosBiblioteca";
import type { AudioCarpeta } from "@/components/audios/AudiosBiblioteca";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AudiosPage(): Promise<React.ReactElement> {
  const session = await getServerSession(authOptions);
  const radioId = session?.user?.radioId ?? "";

  const [carpetasRaw, radio] = await Promise.all([
    prisma.audioCarpeta.findMany({
      where: { radioId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { archivos: { where: { esActivo: true } } } },
      },
    }),
    prisma.radio.findUnique({
      where: { id: radioId },
      select: { aireToken: true },
    }),
  ]);

  const carpetas: AudioCarpeta[] = carpetasRaw.map((c) => ({
    id: c.id,
    radioId: c.radioId,
    nombre: c.nombre,
    modoRotacion: c.modoRotacion,
    esActiva: c.esActiva,
    archivosCount: c._count.archivos,
  }));

  return <AudiosBiblioteca aireToken={radio?.aireToken ?? ""} initialCarpetas={carpetas} />;
}
