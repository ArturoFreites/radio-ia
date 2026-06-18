import { lineasLocutorMonologo, type LocutorPromptConfig } from "@/lib/gemini/locutorPrompt";

export function buildEntretenimientoPrompt(input: {
  subtipos: string[];
  ciudadClima?: string;
  datosClima?: string;
  fechaHoy: string;
  estiloRadio: string;
  nombrePrograma: string;
  locutor?: LocutorPromptConfig;
}): string {
  return `${lineasLocutorMonologo(input.locutor)}Escribe un bloque de entretenimiento radial.
Programa: ${input.nombrePrograma}
Fecha: ${input.fechaHoy}
Subtipos: ${input.subtipos.join(", ")}
Ciudad clima: ${input.ciudadClima ?? "no aplica"}
Datos clima: ${input.datosClima ?? "sin datos"}
Estilo radio: ${input.estiloRadio}
Instruccion editorial: toma el titulo del programa como pie creativo para el dialogo y remata con una frase alineada a ese titulo.
Solo texto plano.
Voz rioplatense: voseo, giros naturales del habla porteña, tono directo y cercano, sin exagerar.`;
}
