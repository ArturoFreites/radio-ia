"use client";

import { useEffect, useState } from "react";

const TZ_AR = "America/Argentina/Buenos_Aires";

function formatHoraArgentina(d: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: TZ_AR,
  }).format(d);
}

export function RelojClock({ className }: { className?: string }): React.ReactElement {
  const [ahora, setAhora] = useState<string>(() => formatHoraArgentina(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setAhora(formatHoraArgentina(new Date()));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={className ?? ""}>
      <span className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-white">{ahora}</span>
    </div>
  );
}
