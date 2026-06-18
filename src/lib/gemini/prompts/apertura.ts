import { lineasLocutorMonologo, type LocutorPromptConfig } from "@/lib/gemini/locutorPrompt";

export function buildAperturaPrompt(config: {
  nombrePrograma: string;
  horario: "mañana" | "tarde" | "noche";
  diaDeSemana: string;
  estiloRadio: string;
  locutor?: LocutorPromptConfig;
}): string {
  return `${lineasLocutorMonologo(config.locutor)}Escribe la apertura de un programa de radio. Solo el diálogo del locutor, nada más.

Datos:
- Programa: "${config.nombrePrograma}"
- Día: ${config.diaDeSemana}
- Horario: ${config.horario}
- Estilo de la radio: ${config.estiloRadio}

El locutor debe mencionar el día de la semana, el nombre del programa y dar una bienvenida breve y natural.

REGLAS ESTRICTAS:
- Solo texto plano que será leído en voz alta
- Sin markdown, sin asteriscos, sin acotaciones, sin etiquetas
- Sin frases como "Aquí está el guión:" o cualquier introducción
- Máximo 40 palabras
- Español rioplatense: voseo, giros naturales del habla porteña, tono directo y cercano, sin exagerar

Escribe únicamente el texto que dirá el locutor.`;
}
