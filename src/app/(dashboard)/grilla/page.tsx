import { getServerSession } from "next-auth";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { GrillaEditor } from "@/components/grilla/GrillaEditor";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function GrillaPage(): Promise<React.ReactElement> {
  const session = await getServerSession(authOptions);
  const radioId = session?.user?.radioId ?? "";
  const radio = radioId
    ? await prisma.radio.findUnique({
        where: { id: radioId },
        select: { aireToken: true, nombre: true },
      })
    : null;

  return (
    <main className="space-y-6">
      <DashboardTopbar
        aireToken={radio?.aireToken ?? null}
        radioNombre={radio?.nombre ?? "Radio"}
        usuarioNombre={session?.user?.nombre ?? session?.user?.email ?? "Usuario"}
      />
      <GrillaEditor />
    </main>
  );
}
