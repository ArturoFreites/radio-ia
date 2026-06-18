import { lineasLocutorMonologo, type LocutorPromptConfig } from "@/lib/gemini/locutorPrompt";
import { REGLAS_TEXTO_LOCUTABLE } from "@/lib/publicidad/guionLocucion";

export function buildPublicidadGuionPrompt(input: {
  nombrePrograma?: string;
  nombre: string;
  rubro?: string;
  telefono?: string;
  direccion?: string;
  notas?: string;
  estilo: string;
  estiloRadio: string;
  locutor?: LocutorPromptConfig;
}): string {
  return `${lineasLocutorMonologo(input.locutor)}Redactá el guión hablado de una publicidad radial en español rioplatense (voseo natural, tono ${input.estilo}).
Programa: ${input.nombrePrograma ?? "Radio"}
Anunciante: ${input.nombre}
Rubro: ${input.rubro ?? "no especificado"}
Teléfono: ${input.telefono ?? "no aplica"}
Dirección: ${input.direccion ?? "no aplica"}
Notas / brief: ${input.notas?.trim() ? input.notas.trim() : "sin brief adicional"}
Estilo radio: ${input.estiloRadio}
Duración al hablar: unos 20 segundos.
${REGLAS_TEXTO_LOCUTABLE}`;
}

export function buildPublicidadPrompt(input: {
  nombreAnunciante: string;
  infoAnunciante: string;
  duracionObjetivo: number;
  estiloRadio: string;
  locutor?: LocutorPromptConfig;
}): string {
  return `${lineasLocutorMonologo(input.locutor)}Redactá el guión hablado de una publicidad radial en español rioplatense.
Anunciante: ${input.nombreAnunciante}
Información: ${input.infoAnunciante}
Estilo radio: ${input.estiloRadio}
Duración al hablar: ${input.duracionObjetivo} segundos.
${REGLAS_TEXTO_LOCUTABLE}`;
}

export function buildBusquedaAnunciantePrompt(input: {
  nombreAnunciante: string;
  urlAnunciante?: string;
}): string {
  return `Investigá brevemente al anunciante "${input.nombreAnunciante}"${
    input.urlAnunciante ? ` (${input.urlAnunciante})` : ""
  } y devolvé un párrafo corto con productos, servicios u ofertas relevantes para una cuña radial en Argentina.
Solo texto plano, sin markdown ni listas.`;
}

/** Compatibilidad con bloques CUNA del editor de programas. */
export function buildCunaPrompt(input: {
  nombrePrograma: string;
  anunciante: string;
  producto: string;
  oferta?: string;
  telefono?: string;
  direccion?: string;
  estilo: string;
  duracionObjetivo: number;
  estiloRadio: string;
  locutor?: LocutorPromptConfig;
}): string {
  const brief = [input.producto, input.oferta].filter(Boolean).join(". ");
  return buildPublicidadGuionPrompt({
    nombrePrograma: input.nombrePrograma,
    nombre: input.anunciante,
    rubro: input.producto,
    telefono: input.telefono,
    direccion: input.direccion,
    notas: brief || undefined,
    estilo: input.estilo,
    estiloRadio: input.estiloRadio,
    locutor: input.locutor,
  });
}
