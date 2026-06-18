import { getPartesArgentina } from "@/lib/grilla/tiempo";

export type DiaSemanaInfo = {
  diaDeSemana: number;
  etiqueta: string;
  etiquetaCorta: string;
  numero: number;
  esHoy: boolean;
};

const ETIQUETAS: Array<{ valor: number; corta: string; larga: string }> = [
  { valor: 1, corta: "LUN", larga: "Lunes" },
  { valor: 2, corta: "MAR", larga: "Martes" },
  { valor: 3, corta: "MIE", larga: "Miércoles" },
  { valor: 4, corta: "JUE", larga: "Jueves" },
  { valor: 5, corta: "VIE", larga: "Viernes" },
  { valor: 6, corta: "SAB", larga: "Sábado" },
  { valor: 0, corta: "DOM", larga: "Domingo" },
];

function dateFromYmd(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function inicioSemanaArgentina(ref: Date = new Date()): Date {
  const p = getPartesArgentina(ref);
  const hoy = dateFromYmd(p.year, p.month, p.day);
  const jsDay = hoy.getUTCDay();
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  hoy.setUTCDate(hoy.getUTCDate() + diffToMonday);
  return hoy;
}

export function diasSemanaDesde(inicio: Date, hoyWeekday: number): DiaSemanaInfo[] {
  return ETIQUETAS.map(({ valor, corta, larga }) => {
    const offset = valor === 0 ? 6 : valor - 1;
    const d = new Date(inicio);
    d.setUTCDate(d.getUTCDate() + offset);
    return {
      diaDeSemana: valor,
      etiqueta: larga,
      etiquetaCorta: corta,
      numero: d.getUTCDate(),
      esHoy: valor === hoyWeekday,
    };
  });
}

export function rangoSemanaEtiqueta(inicio: Date): string {
  const fin = new Date(inicio);
  fin.setUTCDate(fin.getUTCDate() + 6);
  const mesInicio = inicio.toLocaleDateString("es-AR", { month: "long", timeZone: "UTC" });
  const mesFin = fin.toLocaleDateString("es-AR", { month: "long", timeZone: "UTC" });
  const anio = inicio.getUTCFullYear();
  const d1 = inicio.getUTCDate();
  const d2 = fin.getUTCDate();
  if (mesInicio === mesFin) {
    return `${d1} – ${d2} de ${mesInicio}, ${anio}`;
  }
  return `${d1} de ${mesInicio} – ${d2} de ${mesFin}, ${anio}`;
}
