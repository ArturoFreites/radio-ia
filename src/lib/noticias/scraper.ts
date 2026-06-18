import { GEMINI_TEXT_MODEL, getGenAI } from "@/lib/gemini/client";
import { registrarConsumoGemini } from "@/lib/consumo/registrar";

export async function extraerContenidoNoticia(url: string, radioId?: string): Promise<string> {
  const genai = getGenAI();
  const response = await genai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: `Lee el contenido de esta noticia y devolvé SOLO texto plano con este esquema (mantené las etiquetas en mayúsculas):

TITULAR: (una línea)
FECHA_PUBLICACION: (día/mes/año y hora si figuran en el artículo; si no consta escribí "No informada")
FECHA_HECHO: (cuándo ocurrió lo narrado, con día, mes, año y hora si aparecen; si no aplica o no consta: "No aplica" o "No informada")
LUGAR: (ciudad/región/país si está claro; si no: "No informado")
CUERPO: (3-4 párrafos con los hechos principales, sin opiniones del medio)

Reglas: solo contenido informativo, sin publicidad ni menús. URL: ${url}`,
  });
  if (radioId) {
    await registrarConsumoGemini({ radioId, response }).catch(() => undefined);
  }
  return response.text ?? "";
}
