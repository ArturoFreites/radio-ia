import { prisma } from "@/lib/prisma";

export type RadioPorAireToken = {
  id: string;
  nombre: string;
  ciudad: string;
  estiloLocucion: string | null;
};

export async function resolverRadioPorAireToken(
  token: string | null | undefined,
): Promise<RadioPorAireToken | null> {
  if (!token) return null;
  const radio = await prisma.radio.findUnique({
    where: { aireToken: token },
    select: { id: true, nombre: true, ciudad: true, estiloLocucion: true },
  });
  return radio;
}
