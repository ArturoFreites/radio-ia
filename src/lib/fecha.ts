const TZ_AR = "America/Argentina/Buenos_Aires";

export function getDiaDeSemana(date = new Date()): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    timeZone: TZ_AR,
  }).format(date);
}

/** Fecha y hora local (Argentina) para contextualizar el guion al aire. */
export function getFechaHoraArgentina(date = new Date()): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: TZ_AR,
  }).format(date);
}
