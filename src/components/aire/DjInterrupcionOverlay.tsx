"use client";

import { useEffect, useState } from "react";
import { AireScopedOverlay } from "@/components/aire/AireScopedOverlay";
import type { TipoInterrupcionDj } from "@/types/grilla";
import { formatHoraArgentina } from "@/lib/aire/djInterrupciones";

type DjInterrupcionOverlayProps = {
  visible: boolean;
  tipo: TipoInterrupcionDj | null;
  subtitulo?: string;
  scoped?: boolean;
};

const TITULOS: Record<TipoInterrupcionDj, string> = {
  HORA: "La hora",
  CLIMA: "El tiempo",
  PUBLICIDAD: "Publicidad",
};

export function DjInterrupcionOverlay({
  visible,
  tipo,
  subtitulo,
  scoped = true,
}: DjInterrupcionOverlayProps): React.ReactElement {
  const [hora, setHora] = useState(() => formatHoraArgentina(new Date()));

  useEffect(() => {
    if (!visible || tipo !== "HORA") return undefined;
    const id = window.setInterval(() => {
      setHora(formatHoraArgentina(new Date()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [visible, tipo]);

  const titulo = tipo ? TITULOS[tipo] : "";

  return (
    <AireScopedOverlay visible={visible} scoped={scoped}>
      <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--primary)]">
        {titulo}
      </p>
      {tipo === "HORA" ? (
        <p className="text-center font-mono text-5xl font-bold tabular-nums text-white">{hora}</p>
      ) : null}
      {tipo === "CLIMA" ? (
        <p className="text-center text-4xl" aria-hidden>
          ⛅
        </p>
      ) : null}
      {tipo === "PUBLICIDAD" && subtitulo ? (
        <p className="text-center text-lg font-medium text-white">{subtitulo}</p>
      ) : null}
    </AireScopedOverlay>
  );
}
