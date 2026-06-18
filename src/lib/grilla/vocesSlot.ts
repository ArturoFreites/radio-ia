import { prisma } from "@/lib/prisma";

export async function validarVocesSlotParaRadio(
  radioId: string,
  voz1Id: string | null | undefined,
  voz2Id: string | null | undefined,
): Promise<{ voz1Id: string | null; voz2Id: string | null } | { error: string }> {
  const ids = [voz1Id, voz2Id].filter((id): id is string => typeof id === "string" && id.length > 0);
  if (ids.length === 0) {
    return { voz1Id: null, voz2Id: null };
  }
  const asignadas = await prisma.radioVoz.findMany({
    where: { radioId, vozId: { in: ids } },
    select: { vozId: true },
  });
  const permitidas = new Set(asignadas.map((r) => r.vozId));
  for (const id of ids) {
    if (!permitidas.has(id)) {
      return { error: "Voz no disponible para esta radio" };
    }
  }
  return {
    voz1Id: voz1Id && voz1Id.length > 0 ? voz1Id : null,
    voz2Id: voz2Id && voz2Id.length > 0 ? voz2Id : null,
  };
}
