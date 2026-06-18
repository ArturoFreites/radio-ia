import { lineasLocutorMonologo, type LocutorPromptConfig } from "@/lib/gemini/locutorPrompt";

export function buildIntroPrompt(input: {
  nombrePrograma: string;
  horario: string;
  estilo: string;
  estiloRadio: string;
  nombreRadio: string;
  locutor?: LocutorPromptConfig;
}): string {
  return `${lineasLocutorMonologo(input.locutor)}Escribe una intro radial breve.
Radio: ${input.nombreRadio}
Programa: ${input.nombrePrograma}
Horario: ${input.horario}
Estilo: ${input.estilo}
Estilo de radio: ${input.estiloRadio}
Instruccion editorial: usa el titulo del programa como hilo conductor del texto y el tono del dialogo.
Solo texto plano, maximo 50 palabras.
Voz rioplatense: voseo, giros naturales del habla porteña, tono directo y cercano, sin exagerar.`;
}
