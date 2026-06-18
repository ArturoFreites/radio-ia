import { getServerSession } from "next-auth";
import { ConfiguracionEditor } from "@/components/dashboard/ConfiguracionEditor";
import { authOptions } from "@/lib/auth";
import { buildUrlAire } from "@/lib/configuracion/urlAire";
import { prisma } from "@/lib/prisma";
import type { ConfiguracionResponse } from "@/types/configuracion";

export default async function ConfiguracionPage(): Promise<React.ReactElement> {
  const session = await getServerSession(authOptions);
  const radioId = session?.user?.radioId ?? "";
  const radio = await prisma.radio.findUnique({
    where: { id: radioId },
    select: {
      nombre: true,
      estiloLocucion: true,
      aireToken: true,
    },
  });

  const initial: ConfiguracionResponse = {
    nombre: radio?.nombre ?? "",
    estiloLocucion: radio?.estiloLocucion ?? null,
    aireToken: radio?.aireToken ?? "",
    urlAire: radio?.aireToken ? await buildUrlAire(radio.aireToken) : "",
  };

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Configuracion</h1>
      <ConfiguracionEditor initial={initial} />
    </main>
  );
}
