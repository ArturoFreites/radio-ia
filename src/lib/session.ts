import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getSessionRadioId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const radioId = session?.user?.radioId ?? null;
  if (!radioId) return null;

  const radio = await prisma.radio.findUnique({
    where: { id: radioId },
    select: { id: true },
  });
  return radio?.id ?? null;
}
