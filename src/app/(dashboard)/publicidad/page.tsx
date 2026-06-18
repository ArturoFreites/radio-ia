import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { PublicidadManager } from "@/components/publicidad/PublicidadManager";
import type { LocutorRowData } from "@/components/monetizacion/LocutorRow";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toLocutorRow(item: {
  alias: string | null;
  nombreAlAire: string | null;
  personalidad: string | null;
  voz: {
    id: string;
    nombre: string;
    genero: LocutorRowData["genero"];
    tono: LocutorRowData["tono"];
    idioma: string;
    geminiVoiceId: string;
    previewUrl: string | null;
  };
}): LocutorRowData {
  return {
    id: item.voz.id,
    geminiVoiceId: item.voz.geminiVoiceId,
    alias: item.alias ?? item.voz.nombre,
    nombreAlAire: item.nombreAlAire,
    personalidad: item.personalidad,
    genero: item.voz.genero,
    tono: item.voz.tono,
    idioma: item.voz.idioma,
    previewUrl: item.voz.previewUrl,
  };
}

export default async function PublicidadPage(): Promise<React.ReactElement> {
  const session = await getServerSession(authOptions);
  const radioId = session?.user?.radioId ?? "";

  const [clientes, radioVoces, radio] = await Promise.all([
    prisma.anunciante.findMany({
      where: { radioId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.radioVoz.findMany({
      where: { radioId },
      include: { voz: true },
    }),
    prisma.radio.findUnique({
      where: { id: radioId },
      select: { aireToken: true },
    }),
  ]);

  const voces = radioVoces.map(toLocutorRow);

  return (
    <Suspense fallback={<main className="p-4 text-[color:var(--muted)]">Cargando…</main>}>
      <PublicidadManager clientes={clientes} voces={voces} aireToken={radio?.aireToken ?? ""} />
    </Suspense>
  );
}
