import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.radioId) {
    redirect("/login");
  }

  const radio = await prisma.radio.findUnique({
    where: { id: session.user.radioId },
    select: { nombre: true, aireToken: true },
  });

  return (
    <DashboardShell
      aireToken={radio?.aireToken ?? null}
      radioNombre={radio?.nombre ?? "Radio"}
      userNombre={session.user.nombre ?? session.user.email}
    >
      {children}
    </DashboardShell>
  );
}
