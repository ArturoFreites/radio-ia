"use client";

import { Select } from "@/components/ui/Select";
import { normalizarHoraHHMM } from "@/lib/grilla/tiempo";
import { cn } from "@/lib/utils";

const MINUTOS_PASO = 5;
const MINUTOS = Array.from({ length: 60 / MINUTOS_PASO }, (_, i) => i * MINUTOS_PASO);

const HORARIOS_OPCIONES: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h += 1) {
    for (const m of MINUTOS) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

type HoraInicioInputProps = {
  label?: string;
  value: string;
  onChange: (horaHHMM: string) => void;
  className?: string;
  error?: string;
};

function valorSelectDesdeHHMM(value: string): string {
  const normalizada = normalizarHoraHHMM(value);
  if (!normalizada) return "08:00";
  const [hRaw, mRaw] = normalizada.split(":");
  const minutoRedondeado = Math.round(Number(mRaw) / MINUTOS_PASO) * MINUTOS_PASO;
  const minuto = minutoRedondeado >= 60 ? 55 : minutoRedondeado;
  const candidata = `${hRaw}:${String(minuto).padStart(2, "0")}`;
  return HORARIOS_OPCIONES.includes(candidata) ? candidata : "08:00";
}

export function HoraInicioInput({
  label = "Inicio",
  value,
  onChange,
  className,
  error,
}: HoraInicioInputProps): React.ReactElement {
  const seleccionado = valorSelectDesdeHHMM(value);

  return (
    <div className={cn("min-w-0 w-full", className)}>
      <Select
        label={label}
        aria-label={label}
        value={seleccionado}
        className="tabular-nums"
        onChange={(e) => {
          const normalizada = normalizarHoraHHMM(e.target.value);
          if (normalizada) onChange(normalizada);
        }}
      >
        {HORARIOS_OPCIONES.map((hora) => (
          <option key={hora} value={hora}>
            {hora} hs
          </option>
        ))}
      </Select>
      {error ? <p className="mt-1.5 text-xs text-[color:var(--danger)]">{error}</p> : null}
    </div>
  );
}
