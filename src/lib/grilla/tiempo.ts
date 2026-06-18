const TZ_AR = "America/Argentina/Buenos_Aires";

const WEEKDAY_SHORT_TO_0SUN: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type PartesArgentina = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday0Sun: number;
};

export function getPartesArgentina(date: Date): PartesArgentina {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_AR,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = dtf.formatToParts(date);
  const num = (type: Intl.DateTimeFormatPartTypes): number => {
    const raw = parts.find((p) => p.type === type)?.value;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  };
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  return {
    year: num("year"),
    month: num("month"),
    day: num("day"),
    hour: num("hour"),
    minute: num("minute"),
    second: num("second"),
    weekday0Sun: WEEKDAY_SHORT_TO_0SUN[wd] ?? 0,
  };
}

/** Canonicaliza HH:MM en 24 h (p. ej. `9:5` → `09:05`, `3:30 PM` → `15:30`). Devuelve null si la hora no es válida. */
export function normalizarHoraHHMM(hora: string): string | null {
  const trimmed = hora.trim();
  if (!trimmed) return null;

  const ampm = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(a\.?\s*m\.?|p\.?\s*m\.?)$/i.exec(trimmed);
  if (ampm) {
    let h = Number(ampm[1]);
    const min = Number(ampm[2]);
    const periodo = ampm[3].replace(/\s|\./g, "").toLowerCase();
    const isPm = periodo.startsWith("p");
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
      return null;
    }
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }

  const sinSegundos = /^(\d{1,2}):(\d{2}):\d{2}$/.exec(trimmed);
  const base = sinSegundos ? `${sinSegundos[1]}:${sinSegundos[2]}` : trimmed;

  const m = /^(\d{1,2}):(\d{2})$/.exec(base);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function horaStringAMinutos(horaInicio: string): number {
  const normalizada = normalizarHoraHHMM(horaInicio);
  if (!normalizada) return 0;
  const m = /^(\d{2}):(\d{2})$/.exec(normalizada);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minutosDelDiaActualArgentina(date: Date): number {
  const p = getPartesArgentina(date);
  return p.hour * 60 + p.minute;
}

export function segundosDelDiaActualArgentina(date: Date): number {
  const p = getPartesArgentina(date);
  return p.hour * 3600 + p.minute * 60 + p.second;
}

export function fechaCalendarArgentinaIgual(
  fechaDb: Date,
  partesHoy: Pick<PartesArgentina, "year" | "month" | "day">,
): boolean {
  const y = fechaDb.getUTCFullYear();
  const m = fechaDb.getUTCMonth() + 1;
  const d = fechaDb.getUTCDate();
  return y === partesHoy.year && m === partesHoy.month && d === partesHoy.day;
}

export function utcDateFromYmd(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

export function horaFinDesdeInicioYDuracion(horaInicio: string, duracionMin: number): string {
  const startMin = horaStringAMinutos(horaInicio);
  const endMin = startMin + duracionMin;
  const h = Math.floor(endMin / 60) % 24;
  const m = endMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Inicio del slot hoy en Argentina, ISO 8601 con offset -03:00. */
export function isoHoraInicioArgentina(diaRef: Date, horaInicio: string): string {
  const p = getPartesArgentina(diaRef);
  const mins = horaStringAMinutos(horaInicio);
  const hour = Math.floor(mins / 60);
  const minute = mins % 60;
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(hour)}:${pad(minute)}:00-03:00`;
}
