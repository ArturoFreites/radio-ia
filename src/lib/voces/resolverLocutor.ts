import {
  etiquetaLocutorDialogo,
  type LocutorPromptConfig,
} from "@/lib/gemini/locutorPrompt";
import { prisma } from "@/lib/prisma";

type RadioVozLocutorFields = {
  nombreAlAire: string | null;
  personalidad: string | null;
};

function toLocutor(
  rv: RadioVozLocutorFields | null,
  fallback: "LOCUTOR_A" | "LOCUTOR_B",
): LocutorPromptConfig {
  const nombre = etiquetaLocutorDialogo(rv?.nombreAlAire, fallback);
  return {
    nombre,
    ...(rv?.personalidad ? { personalidad: rv.personalidad } : {}),
  };
}

export async function resolverLocutorPorVozId(
  radioId: string,
  vozId: string | null | undefined,
  fallback: "LOCUTOR_A" | "LOCUTOR_B",
): Promise<LocutorPromptConfig | undefined> {
  if (!vozId) {
    return undefined;
  }
  const rv = await prisma.radioVoz.findFirst({
    where: { radioId, vozId },
    select: { nombreAlAire: true, personalidad: true },
  });
  return toLocutor(rv, fallback);
}

export async function resolverLocutorPorGeminiVoiceId(
  radioId: string,
  geminiVoiceId: string | null | undefined,
  fallback: "LOCUTOR_A" | "LOCUTOR_B",
): Promise<LocutorPromptConfig | undefined> {
  if (!geminiVoiceId) {
    return undefined;
  }
  const rv = await prisma.radioVoz.findFirst({
    where: { radioId, voz: { geminiVoiceId } },
    select: { nombreAlAire: true, personalidad: true },
  });
  return toLocutor(rv, fallback);
}
