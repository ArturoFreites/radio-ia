import { TipoBloque } from "@prisma/client";
import { GEMINI_TEXT_MODEL, getGenAI } from "@/lib/gemini/client";
import { registrarConsumoGemini } from "@/lib/consumo/registrar";
import type { LocutorPromptConfig } from "@/lib/gemini/locutorPrompt";
import { buildCierrePrompt } from "@/lib/gemini/prompts/cierre";
import { buildCunaPrompt } from "@/lib/gemini/prompts/publicidad";
import { buildEntretenimientoPrompt } from "@/lib/gemini/prompts/entretenimiento";
import { buildIntroPrompt } from "@/lib/gemini/prompts/intro";
import { buildNoticiasPrompt } from "@/lib/gemini/prompts/noticias";
import { buildAperturaPrompt } from "@/lib/gemini/prompts/apertura";
import { buildNoticiaPrompt } from "@/lib/gemini/prompts/noticia";
import { buildPublicidadPrompt } from "@/lib/gemini/prompts/publicidad";
import { buildTransicionPrompt } from "@/lib/gemini/prompts/transiciones";
import { getDiaDeSemana, getFechaHoraArgentina } from "@/lib/fecha";
import { extraerContenidoNoticia } from "@/lib/noticias/scraper";

async function runPrompt(prompt: string, radioId?: string): Promise<string> {
  const genai = getGenAI();
  const response = await genai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: prompt,
  });
  if (radioId) {
    await registrarConsumoGemini({ radioId, response }).catch(() => undefined);
  }
  return response.text ?? "";
}

export async function generarTextoGemini(prompt: string, radioId?: string): Promise<string> {
  return runPrompt(prompt, radioId);
}

export async function generarGuionPorTipo(input: {
  radioId?: string;
  tipo: TipoBloque;
  titulo: string;
  config: Record<string, unknown>;
  estiloRadio: string;
  nombrePrograma: string;
  nombreRadio: string;
  noticias: string[];
  locutorA?: LocutorPromptConfig;
  locutorB?: LocutorPromptConfig;
}): Promise<string> {
  const locutor = input.locutorA;
  const radioId = input.radioId;
  const emitir = (prompt: string): Promise<string> => runPrompt(prompt, radioId);

  switch (input.tipo) {
    case TipoBloque.INTRO:
      return emitir(
        buildIntroPrompt({
          nombrePrograma: input.nombrePrograma,
          horario: String(input.config.horario ?? "manana"),
          estilo: String(input.config.estilo ?? "dinamico"),
          estiloRadio: input.estiloRadio,
          nombreRadio: input.nombreRadio,
          locutor,
        }),
      );
    case TipoBloque.NOTICIAS:
      return emitir(
        buildNoticiasPrompt({
          noticias: input.noticias,
          cantidadNoticias: Number(input.config.cantidadNoticias ?? 5),
          enfoque: (input.config.enfoque as "local" | "nacional" | "internacional") ?? "nacional",
          estiloRadio: input.estiloRadio,
          nombrePrograma: input.nombrePrograma,
          ciudadRadio: String(input.config.ciudadRadio ?? "Buenos Aires"),
          locutor,
        }),
      );
    case TipoBloque.CUNA:
      return emitir(
        buildCunaPrompt({
          nombrePrograma: input.nombrePrograma,
          anunciante: String(input.config.anunciante ?? "Anunciante"),
          producto: String(input.config.producto ?? "Producto"),
          estilo: String(input.config.estilo ?? "energetico"),
          duracionObjetivo: Number(input.config.duracionObjetivo ?? 30),
          estiloRadio: input.estiloRadio,
          oferta: input.config.oferta ? String(input.config.oferta) : undefined,
          telefono: input.config.telefono ? String(input.config.telefono) : undefined,
          direccion: input.config.direccion ? String(input.config.direccion) : undefined,
          locutor,
        }),
      );
    case TipoBloque.ENTRETENIMIENTO:
      return emitir(
        buildEntretenimientoPrompt({
          subtipos: Array.isArray(input.config.subtipos) ? input.config.subtipos.map(String) : ["trivia"],
          ciudadClima: input.config.ciudadClima ? String(input.config.ciudadClima) : undefined,
          datosClima: input.config.datosClima ? String(input.config.datosClima) : undefined,
          fechaHoy: new Date().toISOString(),
          estiloRadio: input.estiloRadio,
          nombrePrograma: input.nombrePrograma,
          locutor,
        }),
      );
    case TipoBloque.TRANSICION:
      return emitir(
        buildTransicionPrompt({
          bloqueAnterior: String(input.config.bloqueAnterior ?? "bloque anterior"),
          bloqueSiguiente: String(input.config.bloqueSiguiente ?? "bloque siguiente"),
          estilo: String(input.config.estilo ?? "natural"),
          nombrePrograma: input.nombrePrograma,
          estiloRadio: input.estiloRadio,
          locutor,
        }),
      );
    case TipoBloque.CIERRE:
      return emitir(
        buildCierrePrompt({
          nombrePrograma: input.nombrePrograma,
          nombreRadio: input.nombreRadio,
          mensajeDespedida: input.config.mensajeDespedida ? String(input.config.mensajeDespedida) : undefined,
          estiloRadio: input.estiloRadio,
          locutor,
        }),
      );
    case TipoBloque.SALUDO:
      return emitir(`Escribe un saludo radial breve para ${String(input.config.nombre ?? "oyente")}. Español rioplatense, voseo, tono cercano. Máximo 20 palabras. Solo texto plano.`);
    case TipoBloque.APERTURA: {
      const rawHorario = String(input.config.horario ?? "mañana").toLowerCase();
      const horario: "mañana" | "tarde" | "noche" =
        rawHorario === "tarde" ? "tarde" : rawHorario === "noche" ? "noche" : "mañana";
      return emitir(
        buildAperturaPrompt({
          nombrePrograma: String(input.config.nombrePrograma ?? input.nombrePrograma),
          horario,
          diaDeSemana: getDiaDeSemana(),
          estiloRadio: input.estiloRadio,
          locutor,
        }),
      );
    }
    case TipoBloque.NOTICIA: {
      const contenido =
        typeof input.config.contenidoNoticiaCache === "string" && input.config.contenidoNoticiaCache.length > 0
          ? input.config.contenidoNoticiaCache
          : input.config.urlNoticia
            ? await extraerContenidoNoticia(String(input.config.urlNoticia), radioId)
            : "";
      const rawEstilo = String(input.config.estiloConversacion ?? "profesional");
      const estiloConversacion: "profesional" | "distendido" =
        rawEstilo === "distendido" ? "distendido" : "profesional";
      return emitir(
        buildNoticiaPrompt({
          contenidoNoticia: contenido,
          estiloRadio: input.estiloRadio,
          nombrePrograma: input.nombrePrograma,
          locutorA: input.locutorA,
          locutorB: input.locutorB,
          estiloConversacion,
          referenciaTemporalEmision: getFechaHoraArgentina(),
        }),
      );
    }
    case TipoBloque.PUBLICIDAD: {
      const info =
        typeof input.config.infoAnuncianteCache === "string" && input.config.infoAnuncianteCache.length > 0
          ? input.config.infoAnuncianteCache
          : String(input.config.nombreAnunciante ?? "Anunciante");
      return emitir(
        buildPublicidadPrompt({
          nombreAnunciante: String(input.config.nombreAnunciante ?? "Anunciante"),
          infoAnunciante: info,
          duracionObjetivo: Number(input.config.duracionObjetivo ?? 20),
          estiloRadio: input.estiloRadio,
          locutor,
        }),
      );
    }
    default:
      return input.titulo;
  }
}
