export type TipoAudioGenerado =
  | "PRESENTACION"
  | "INTRO_APERTURA"
  | "TRANSICION_SLOT"
  | "PUBLICIDAD"
  | "DEMO_PUBLICIDAD";

const TIPO_ETIQUETA: Record<TipoAudioGenerado, string> = {
  PRESENTACION: "Presentacion",
  INTRO_APERTURA: "Intro",
  TRANSICION_SLOT: "Transicion",
  PUBLICIDAD: "Publicidad",
  DEMO_PUBLICIDAD: "Demo-Publicidad",
};

const TIMEZONE_DEFAULT = "America/Argentina/Buenos_Aires";

export function etiquetaTipoAudio(tipo: TipoAudioGenerado): string {
  return TIPO_ETIQUETA[tipo];
}

export function slugTituloDescarga(titulo: string): string {
  const normalizado = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return normalizado.length > 0 ? normalizado : "audio";
}

function partesFechaEnZona(
  date: Date,
  timeZone: string,
): { yyyyMmDd: string; hhmm: string } {
  const fecha = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const hora = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(":", "");

  return { yyyyMmDd: fecha, hhmm: hora };
}

export type NombreDescargaParams = {
  tipo: TipoAudioGenerado;
  titulo: string;
  creadoEn: Date;
  timeZone?: string;
  incluirHora?: boolean;
};

export function nombreDescargaAudio(params: NombreDescargaParams): string {
  const timeZone = params.timeZone ?? TIMEZONE_DEFAULT;
  const { yyyyMmDd, hhmm } = partesFechaEnZona(params.creadoEn, timeZone);
  const etiqueta = etiquetaTipoAudio(params.tipo);
  const slug = slugTituloDescarga(params.titulo);
  const fechaParte = params.incluirHora ? `${yyyyMmDd}_${hhmm}` : yyyyMmDd;
  return `${etiqueta}_${slug}_${fechaParte}.mp3`;
}

export function claveNombreDescargaBase(params: {
  tipo: TipoAudioGenerado;
  titulo: string;
  creadoEn: Date;
  timeZone?: string;
}): string {
  const timeZone = params.timeZone ?? TIMEZONE_DEFAULT;
  const { yyyyMmDd } = partesFechaEnZona(params.creadoEn, timeZone);
  return `${etiquetaTipoAudio(params.tipo)}_${slugTituloDescarga(params.titulo)}_${yyyyMmDd}`;
}
