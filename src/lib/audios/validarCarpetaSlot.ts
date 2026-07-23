import { prisma } from "@/lib/prisma";

export async function validarCarpetaAudioParaSlot(
  radioId: string,
  carpetaId: string | null | undefined,
  activa: boolean,
): Promise<{ ok: true; carpetaId: string | null } | { ok: false; error: string }> {
  if (!activa) {
    return { ok: true, carpetaId: null };
  }
  if (!carpetaId) {
    return { ok: false, error: "Seleccioná una carpeta de audios con al menos un archivo activo" };
  }

  const carpeta = await prisma.audioCarpeta.findFirst({
    where: { id: carpetaId, radioId, esActiva: true },
    select: {
      id: true,
      _count: { select: { archivos: { where: { esActivo: true } } } },
    },
  });

  if (!carpeta) {
    return { ok: false, error: "Carpeta de audios no encontrada" };
  }
  if (carpeta._count.archivos === 0) {
    return { ok: false, error: "La carpeta no tiene archivos activos" };
  }

  return { ok: true, carpetaId: carpeta.id };
}
