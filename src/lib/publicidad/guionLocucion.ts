/** Reglas compartidas: la salida va directo a TTS sin edición. */
export const REGLAS_TEXTO_LOCUTABLE = `
REGLAS OBLIGATORIAS DE FORMATO:
- Devolvé ÚNICAMENTE las palabras que el locutor dirá al micrófono, en un solo párrafo continuo.
- PROHIBIDO: indicaciones de música, efectos, SFX, fade, "(MÚSICA:...)", "(SFX:...)".
- PROHIBIDO: encabezados "LOCUTOR:", "**LOCUTOR**", acotaciones de tono "(Voz energética...)", corchetes, markdown, asteriscos, listas.
- PROHIBIDO: frases meta como "Aquí tienes la cuña", "Guión:", "Listo para locución".
- PROHIBIDO: comillas envolviendo todo el texto o saltos de línea innecesarios.
- El texto de tu respuesta se envía tal cual a síntesis de voz: si escribís algo que no se dice en voz alta, el locutor lo leerá.`;

export function normalizarGuionParaLocucion(raw: string): string {
  let text = raw.trim();
  if (!text) return "";

  text = text.replace(/^aquí (?:tenés|tienes|va).{0,120}(?:locución|guión|guion).*?:?\s*/i, "");
  text = text.replace(/^guión(?: publicitario)?:?\s*/i, "");

  const lineas = text.split(/\n+/);
  const fragmentos: string[] = [];

  for (let linea of lineas) {
    linea = linea.trim();
    if (!linea) continue;

    if (/^\*?\*?\(?\s*MÚSICA:/i.test(linea)) continue;
    if (/^\*?\*?\(?\s*SFX:/i.test(linea)) continue;
    if (/^\*?\*?\(?\s*EFECTO:/i.test(linea)) continue;

    if (/^\*?\*?LOCUTOR/i.test(linea)) {
      const despuesDosPuntos = linea.replace(/^.*?:\s*/, "").replace(/\*\*/g, "").trim();
      if (despuesDosPuntos && !/^\([^)]*\)$/.test(despuesDosPuntos)) {
        fragmentos.push(despuesDosPuntos);
      }
      continue;
    }

    linea = linea.replace(/\*\*/g, "").replace(/\*/g, "").replace(/^#+\s*/, "").trim();

    if (/^\([^)]*\)$/.test(linea)) continue;

    linea = linea.replace(/^\([^)]*\)\s*:?\s*/, "").trim();
    linea = linea.replace(/^\[[^\]]*\]\s*/, "").trim();

    if (linea) fragmentos.push(linea);
  }

  return fragmentos.join(" ").replace(/\s+/g, " ").trim();
}
