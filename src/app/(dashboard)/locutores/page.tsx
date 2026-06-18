import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { LocutoresIaWorkspace } from "@/components/locutores/LocutoresIaWorkspace";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LocutoresPage(): Promise<React.ReactElement> {
  const session = await getServerSession(authOptions);
  const radioId = session?.user?.radioId ?? "";

  const voces = await prisma.radioVoz.findMany({
    where: { radioId },
    include: { voz: true },
  });

  return (
    <Suspense fallback={<main className="p-4 text-[color:var(--muted)]">Cargando…</main>}>
      <LocutoresIaWorkspace voces={voces} />
    </Suspense>
  );
}
