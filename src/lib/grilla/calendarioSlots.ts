import { horaStringAMinutos } from "@/lib/grilla/tiempo";

export const PX_PER_MIN = 1;
export const MINUTOS_SLOT_MINIMO = 15;
export const MINUTOS_TOTAL_DIA = 24 * 60;

export function snapMinutosA15(m: number): number {
  const s = Math.round(m / 15) * 15;
  return Math.max(0, Math.min(MINUTOS_TOTAL_DIA - MINUTOS_SLOT_MINIMO, s));
}

export function minutosAHoraHHMM(m: number): string {
  const clamped = Math.max(0, Math.min(MINUTOS_TOTAL_DIA - 1, m));
  const h = Math.floor(clamped / 60);
  const min = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

type Intervalo = { id: string; start: number; end: number };

function intervalosDesdeSlots<T extends { id: string; horaInicio: string; duracionMin: number }>(
  slots: T[],
): Intervalo[] {
  return slots.map((s) => {
    const start = horaStringAMinutos(s.horaInicio);
    const end = start + s.duracionMin;
    return { id: s.id, start, end };
  });
}

function seSolapan(a: Intervalo, b: Intervalo): boolean {
  return a.start < b.end && b.start < a.end;
}

function clustersPorSolapamiento(intervalos: Intervalo[]): Intervalo[][] {
  const visitado = new Set<string>();
  const resultado: Intervalo[][] = [];

  for (const ini of intervalos) {
    if (visitado.has(ini.id)) continue;
    const pila = [ini];
    const grupo: Intervalo[] = [];
    visitado.add(ini.id);
    while (pila.length > 0) {
      const cur = pila.pop()!;
      grupo.push(cur);
      for (const otro of intervalos) {
        if (visitado.has(otro.id)) continue;
        if (seSolapan(cur, otro)) {
          visitado.add(otro.id);
          pila.push(otro);
        }
      }
    }
    resultado.push(grupo);
  }
  return resultado;
}

function profundidadMaximaCluster(intervalos: Intervalo[]): number {
  type Ev = { t: number; d: number };
  const evs: Ev[] = [];
  for (const i of intervalos) {
    evs.push({ t: i.start, d: 1 }, { t: i.end, d: -1 });
  }
  evs.sort((a, b) => (a.t !== b.t ? a.t - b.t : a.d - b.d));
  let cur = 0;
  let max = 0;
  for (const e of evs) {
    cur += e.d;
    max = Math.max(max, cur);
  }
  return Math.max(1, max);
}

type Activo = { end: number; col: number };

function asignarColumnasGreedy(intervalos: Intervalo[]): Map<string, number> {
  const sorted = [...intervalos].sort((a, b) => a.start - b.start || a.end - b.end);
  const active: Activo[] = [];
  const cols = new Map<string, number>();
  for (const iv of sorted) {
    let i = active.length;
    while (i--) {
      if (active[i].end <= iv.start) active.splice(i, 1);
    }
    const usadas = new Set(active.map((a) => a.col));
    let col = 0;
    while (usadas.has(col)) col += 1;
    active.push({ end: iv.end, col });
    cols.set(iv.id, col);
  }
  return cols;
}

export type LayoutCeldaSlot = { leftPct: number; widthPct: number };

export function layoutSlotsDia<T extends { id: string; horaInicio: string; duracionMin: number }>(
  slots: T[],
): Map<string, LayoutCeldaSlot> {
  const intervalos = intervalosDesdeSlots(slots);
  const grupos = clustersPorSolapamiento(intervalos);
  const layout = new Map<string, LayoutCeldaSlot>();

  for (const grupo of grupos) {
    const d = profundidadMaximaCluster(grupo);
    const cols = asignarColumnasGreedy(grupo);
    for (const iv of grupo) {
      const col = cols.get(iv.id) ?? 0;
      layout.set(iv.id, { leftPct: (col / d) * 100, widthPct: 100 / d });
    }
  }
  return layout;
}
