import { prisma } from "@/lib/prisma";

export async function getBloqueConProgramaRadio(bloqueId: string): Promise<{
  bloque: NonNullable<Awaited<ReturnType<typeof prisma.bloque.findUnique>>>;
  radioId: string;
} | null> {
  const bloque = await prisma.bloque.findUnique({
    where: { id: bloqueId },
    include: { programa: { select: { radioId: true } } },
  });
  if (!bloque) return null;
  return { bloque, radioId: bloque.programa.radioId };
}
