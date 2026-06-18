import { lineasLocutorMonologo, type LocutorPromptConfig } from "@/lib/gemini/locutorPrompt";

export function buildCierrePrompt(input: {
  nombrePrograma: string;
  nombreRadio: string;
  mensajeDespedida?: string;
  estiloRadio: string;
  locutor?: LocutorPromptConfig;
}): string {
  return `${lineasLocutorMonologo(input.locutor)}Escribe un cierre radial breve.
Radio: ${input.nombreRadio}
Programa: ${input.nombrePrograma}
Estilo radio: ${input.estiloRadio}
Mensaje especial: ${input.mensajeDespedida ?? "automatico"}
Instruccion editorial: el cierre debe resumir el sentido del titulo del programa y dejar una ultima frase coherente con ese titulo.
Solo texto plano, maximo 40 palabras.
Voz rioplatense: voseo, giros naturales del habla porteña, tono directo y cercano, sin exagerar.`;
}
