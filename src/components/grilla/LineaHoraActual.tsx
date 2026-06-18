"use client";

import { useEffect, useState } from "react";
import { PX_PER_MIN } from "@/lib/grilla/calendarioSlots";
import { minutosDelDiaActualArgentina } from "@/lib/grilla/tiempo";

export type LineaHoraActualProps = {
  visible: boolean;
};

export function LineaHoraActual({ visible }: LineaHoraActualProps): React.ReactElement | null {
  const [minutosDelDia, setMinutosDelDia] = useState(() => minutosDelDiaActualArgentina(new Date()));

  useEffect(() => {
    if (!visible) return;
    const tick = (): void => {
      setMinutosDelDia(minutosDelDiaActualArgentina(new Date()));
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  const topPx = minutosDelDia * PX_PER_MIN;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
      style={{ top: topPx, transform: "translateY(-50%)" }}
      aria-hidden
    >
      <div className="h-2 w-2 shrink-0 rounded-full bg-[#ef4444]" />
      <div className="h-[2px] min-h-[2px] flex-1 bg-[#ef4444]" />
    </div>
  );
}
