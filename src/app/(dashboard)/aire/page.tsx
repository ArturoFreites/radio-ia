import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AireRedirectPage(): Promise<never> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.radioId) {
    redirect("/login");
  }

  const radio = await prisma.radio.findUnique({
    where: { id: session.user.radioId },
    select: { aireToken: true },
  });

  if (radio?.aireToken) {
    redirect(`/cabina?token=${encodeURIComponent(radio.aireToken)}`);
  }

  redirect("/configuracion");
}
