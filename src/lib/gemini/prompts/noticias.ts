import { lineasLocutorMonologo, type LocutorPromptConfig } from "@/lib/gemini/locutorPrompt";

export function buildNoticiasPrompt(input: {
  noticias: string[];
  cantidadNoticias: number;
  enfoque: "local" | "nacional" | "internacional";
  estiloRadio: string;
  nombrePrograma: string;
  ciudadRadio: string;
  locutor?: LocutorPromptConfig;
}): string {
  return `${lineasLocutorMonologo(input.locutor)}Escribe un bloque radial de noticias en espanol argentino.
Programa: ${input.nombrePrograma}
Ciudad: ${input.ciudadRadio}
Estilo de radio: ${input.estiloRadio}
Enfoque: ${input.enfoque}
Noticias: ${input.noticias.slice(0, input.cantidadNoticias).join(" | ")}
Instruccion editorial: el titulo del programa define el enfoque narrativo; conecta la apertura, desarrollo y cierre con ese titulo.
Requisitos: solo texto plano, tono natural, incluir apertura y cierre. Español rioplatense: voseo, giros naturales del habla porteña, sin exagerar.`;
}
