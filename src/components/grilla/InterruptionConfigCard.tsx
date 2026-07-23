"use client";

import { Clock, CloudSun, Megaphone, MessageSquareText, Music2, Radio } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  clampDjIntervaloMin,
  DJ_INTERRUPCION_INTERVALO_MAX,
  DJ_INTERRUPCION_INTERVALO_MIN,
  DJ_TEXTO_MAX_CHARS,
} from "@/lib/grilla/djConfigSchema";
import { cn } from "@/lib/utils";

export type InterruptionTipo = "hora" | "clima" | "publicidad" | "presentacion" | "audio" | "texto";

export type InterruptionCarpetaOption = { id: string; nombre: string; archivosCount: number };

const ICONOS: Record<InterruptionTipo, React.ReactElement> = {
  hora: <Clock className="h-5 w-5" aria-hidden />,
  clima: <CloudSun className="h-5 w-5" aria-hidden />,
  publicidad: <Megaphone className="h-5 w-5" aria-hidden />,
  presentacion: <Radio className="h-5 w-5" aria-hidden />,
  audio: <Music2 className="h-5 w-5" aria-hidden />,
  texto: <MessageSquareText className="h-5 w-5" aria-hidden />,
};

const TITULOS: Record<InterruptionTipo, string> = {
  hora: "Hora exacta",
  clima: "Clima",
  publicidad: "Publicidad",
  presentacion: "Presentación IA",
  audio: "Audios",
  texto: "Mensaje",
};

const DESCRIPCIONES: Record<InterruptionTipo, string> = {
  hora: "Anuncia la hora en vivo durante el slot.",
  clima: "Inserta el clima local con placeholders {temp} y {city}.",
  publicidad: "Rota publicidades activas del catálogo.",
  presentacion: "Presenta cada N temas con la voz locutora elegida.",
  audio: "Inserta jingles, IDs o cortinas de una carpeta de la biblioteca.",
  texto: "Lee en voz alta un texto fijo que vos escribís.",
};

export type InterruptionConfigCardProps = {
  tipo: InterruptionTipo;
  activo: boolean;
  onActivoChange: (v: boolean) => void;
  intervaloMin?: number;
  onIntervaloChange?: (n: number) => void;
  presentacionCadaTemas?: number;
  onPresentacionCadaTemasChange?: (n: number) => void;
  carpetasOptions?: InterruptionCarpetaOption[];
  carpetaId?: string | null;
  onCarpetaIdChange?: (id: string) => void;
  textoContenido?: string;
  onTextoContenidoChange?: (texto: string) => void;
  className?: string;
};

export function InterruptionConfigCard({
  tipo,
  activo,
  onActivoChange,
  intervaloMin = 60,
  onIntervaloChange,
  presentacionCadaTemas = 2,
  onPresentacionCadaTemasChange,
  carpetasOptions = [],
  carpetaId = null,
  onCarpetaIdChange,
  textoContenido = "",
  onTextoContenidoChange,
  className,
}: InterruptionConfigCardProps): React.ReactElement {
  return (
    <article
      className={cn(
        "rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 transition",
        activo && "border-[color:var(--primary)]/35 bg-[color:var(--primary)]/[0.04]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              activo
                ? "bg-[color:var(--primary)]/15 text-[color:var(--primary)]"
                : "bg-[color:var(--surface-2)] text-[color:var(--muted)]",
            )}
          >
            {ICONOS[tipo]}
          </span>
          <div>
            <h3 className="font-semibold text-[color:var(--text)]">{TITULOS[tipo]}</h3>
            <p className="mt-1 text-sm text-[color:var(--muted)]">{DESCRIPCIONES[tipo]}</p>
          </div>
        </div>
        <label className="relative inline-flex shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={activo}
            onChange={(e) => onActivoChange(e.target.checked)}
          />
          <span className="h-6 w-11 rounded-full bg-[color:var(--surface-2)] transition peer-checked:bg-[color:var(--primary)]" />
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
        </label>
      </div>

      {activo ? (
        <div className="mt-4 space-y-3 border-t border-[color:var(--border)] pt-4">
          {tipo === "presentacion" ? (
            <Select
              label="Frecuencia"
              value={String(presentacionCadaTemas)}
              onChange={(e) => onPresentacionCadaTemasChange?.(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  Cada {n} {n === 1 ? "tema" : "temas"}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              type="number"
              label="Intervalo (minutos)"
              min={DJ_INTERRUPCION_INTERVALO_MIN}
              max={DJ_INTERRUPCION_INTERVALO_MAX}
              step={1}
              value={intervaloMin}
              helperText={`Entre ${DJ_INTERRUPCION_INTERVALO_MIN} y ${DJ_INTERRUPCION_INTERVALO_MAX} minutos`}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                if (e.target.value === "") return;
                onIntervaloChange?.(clampDjIntervaloMin(parsed));
              }}
              onBlur={(e) => {
                onIntervaloChange?.(clampDjIntervaloMin(Number(e.target.value)));
              }}
            />
          )}
          {tipo === "audio" ? (
            carpetasOptions.length === 0 ? (
              <p className="text-xs text-[color:var(--warning)]">
                No hay carpetas activas con audios. Subí audios en{" "}
                <a href="/audios" className="font-medium underline">
                  /audios
                </a>
                .
              </p>
            ) : (
              <Select
                label="Carpeta de audios"
                value={carpetaId ?? ""}
                onChange={(e) => onCarpetaIdChange?.(e.target.value)}
              >
                <option value="">Elegí una carpeta</option>
                {carpetasOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.archivosCount})
                  </option>
                ))}
              </Select>
            )
          ) : null}
          {tipo === "texto" ? (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[color:var(--text)]" htmlFor="dj-texto-contenido">
                Mensaje
              </label>
              <textarea
                id="dj-texto-contenido"
                rows={3}
                maxLength={DJ_TEXTO_MAX_CHARS}
                value={textoContenido}
                onChange={(e) => onTextoContenidoChange?.(e.target.value.slice(0, DJ_TEXTO_MAX_CHARS))}
                placeholder="Ej. Estás escuchando Radio Dejavu, la radio que te acompaña."
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:border-[color:var(--primary)] focus:outline-none"
              />
              <p className="text-right text-xs text-[color:var(--muted)]">
                {textoContenido.length}/{DJ_TEXTO_MAX_CHARS}
              </p>
            </div>
          ) : null}
          <Button variant="secondary" size="sm" disabled className="w-full sm:w-auto">
            Escuchar ejemplo
          </Button>
        </div>
      ) : null}
    </article>
  );
}
