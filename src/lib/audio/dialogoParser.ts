export type TipoTurno = "reaccion" | "pregunta" | "afirmacion" | "pausa";

export type TurnoDialogo = {
  locutor: "A" | "B";
  texto: string;
  tipo: TipoTurno;
};

/** Overlap (positivo) o gap (negativo) del turno entrante respecto al anterior. */
const MS_OVERLAP_TURNO_ENTRANTE: Record<TipoTurno, number> = {
  reaccion: 200,
  pregunta: 80,
  afirmacion: -80,
  pausa: -100,
};

function contarPalabras(texto: string): number {
  const t = texto.trim();
  if (t.length === 0) {
    return 0;
  }
  return t.split(/\s+/).length;
}

export function clasificarTurno(texto: string): TipoTurno {
  const palabras = contarPalabras(texto);
  const t = texto.trim();
  if (palabras <= 7) {
    return "reaccion";
  }
  if (t.endsWith("?")) {
    return "pregunta";
  }
  if (palabras >= 20) {
    return "pausa";
  }
  return "afirmacion";
}

/**
 * Para cada turno[1..N-1]: cuántos ms adelanta su inicio respecto al fin del turno anterior.
 * Positivo = overlap; negativo = gap (|valor| = ms de silencio).
 */
export function overlapsMsEntreTurnos(turnos: TurnoDialogo[]): number[] {
  if (turnos.length <= 1) {
    return [];
  }
  return turnos.slice(1).map((turno) => MS_OVERLAP_TURNO_ENTRANTE[turno.tipo]);
}

export function parsearDialogo(
  guion: string,
  etiquetas?: { locutorA: string; locutorB: string },
): TurnoDialogo[] {
  const etiquetaA = (etiquetas?.locutorA ?? "LOCUTOR_A").trim().toUpperCase();
  const etiquetaB = (etiquetas?.locutorB ?? "LOCUTOR_B").trim().toUpperCase();
  const lineas = guion
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const turnos: TurnoDialogo[] = [];

  for (const linea of lineas) {
    const match = linea.match(/^([^:]+):\s*(.*)$/);
    if (!match) {
      continue;
    }
    const etiqueta = match[1]!.trim().replace(/[*_~`]/g, "").toUpperCase();
    const texto = match[2]!.trim();
    if (!texto) {
      continue;
    }
    if (etiqueta === etiquetaA) {
      turnos.push({ locutor: "A", texto, tipo: clasificarTurno(texto) });
    } else if (etiqueta === etiquetaB) {
      turnos.push({ locutor: "B", texto, tipo: clasificarTurno(texto) });
    }
  }

  return turnos;
}
