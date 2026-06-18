import {
  etiquetaLocutorDialogo,
  lineasPersonajesDialogo,
  type LocutorPromptConfig,
} from "@/lib/gemini/locutorPrompt";

export function buildNoticiaPrompt(config: {
  contenidoNoticia: string;
  estiloRadio: string;
  nombrePrograma?: string;
  locutorA?: LocutorPromptConfig;
  locutorB?: LocutorPromptConfig;
  estiloConversacion?: "profesional" | "distendido";
  referenciaTemporalEmision?: string;
}): string {
  const etiquetaA = etiquetaLocutorDialogo(config.locutorA?.nombre, "LOCUTOR_A");
  const etiquetaB = etiquetaLocutorDialogo(config.locutorB?.nombre, "LOCUTOR_B");
  const estiloConv = config.estiloConversacion ?? "profesional";
  const emision =
    config.referenciaTemporalEmision?.trim() ??
    "No indicada (usá solo fechas y horarios que figuren en el material de la noticia).";
  const programaLine = config.nombrePrograma ? `Programa: "${config.nombrePrograma}"\n` : "";

  return `${lineasPersonajesDialogo(config.locutorA, config.locutorB)}Escribe un diálogo radial entre ${etiquetaA} y ${etiquetaB} sobre esta noticia. Solo las líneas del diálogo, nada más.

${programaLine}CONTEXTO DEL AIRE (Argentina, para coherencia temporal; no lo leas literal si contradice la noticia):
${emision}

NOTICIA (material; respetá fechas y horarios que aparezcan acá):
${config.contenidoNoticia}

FORMATO OBLIGATORIO (una línea por turno):
${etiquetaA}: texto
${etiquetaB}: texto

REGLAS ESTRICTAS:
- Mínimo 4 turnos alternando locutores
- Máximo 130 palabras en total
- Estilo de conversación: ${estiloConv}
- Estilo de la radio: ${config.estiloRadio}
- Solo texto plano que será leído en voz alta
- Sin markdown, sin asteriscos, sin acotaciones entre paréntesis
- Sin frases como "Aquí está el guión:" o cualquier introducción
- Español rioplatense: voseo, giros naturales del habla porteña, tono directo y cercano, sin exagerar
- Reacciones breves y preguntas cortas cuando encajen en la conversación

Escribe únicamente el diálogo con el formato indicado.`;
}
