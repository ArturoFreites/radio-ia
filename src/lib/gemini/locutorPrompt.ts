export type LocutorPromptConfig = {
  nombre: string;
  personalidad?: string;
};

export function etiquetaLocutorDialogo(
  nombreAlAire: string | null | undefined,
  fallback: "LOCUTOR_A" | "LOCUTOR_B",
): string {
  const trimmed = nombreAlAire?.trim();
  return trimmed ? trimmed.toUpperCase() : fallback;
}

export function lineasLocutorMonologo(locutor?: LocutorPromptConfig): string {
  if (!locutor) {
    return "";
  }
  const lineas: string[] = [];
  const esEtiquetaGenerica = locutor.nombre === "LOCUTOR_A" || locutor.nombre === "LOCUTOR_B";
  if (!esEtiquetaGenerica && locutor.nombre) {
    lineas.push(`Locutor: ${locutor.nombre}`);
  }
  if (locutor.personalidad) {
    lineas.push(`Personalidad del locutor: ${locutor.personalidad}`);
  }
  return lineas.length > 0 ? `${lineas.join("\n")}\n` : "";
}

export function lineasPersonajesDialogo(
  locutorA?: LocutorPromptConfig,
  locutorB?: LocutorPromptConfig,
): string {
  const lineas: string[] = [];
  if (locutorA?.personalidad && locutorA.nombre) {
    lineas.push(`PERSONAJE ${locutorA.nombre}: ${locutorA.personalidad}`);
  }
  if (locutorB?.personalidad && locutorB.nombre) {
    lineas.push(`PERSONAJE ${locutorB.nombre}: ${locutorB.personalidad}`);
  }
  return lineas.length > 0 ? `${lineas.join("\n")}\n\n` : "";
}
