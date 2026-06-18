import { lineasLocutorMonologo, type LocutorPromptConfig } from "@/lib/gemini/locutorPrompt";

export function buildTransicionPrompt(input: {
  bloqueAnterior: string;
  bloqueSiguiente: string;
  estilo: string;
  nombrePrograma: string;
  estiloRadio: string;
  locutor?: LocutorPromptConfig;
}): string {
  return `${lineasLocutorMonologo(input.locutor)}Escribe una transicion de radio de maximo 30 palabras.
Programa: ${input.nombrePrograma}
De: ${input.bloqueAnterior}
A: ${input.bloqueSiguiente}
Estilo: ${input.estilo}
Estilo radio: ${input.estiloRadio}
Instruccion editorial: conserva continuidad con el titulo del programa como eje del dialogo.
Solo texto plano.
Voz rioplatense: voseo, giros naturales del habla porteña, tono directo y cercano, sin exagerar.`;
}
