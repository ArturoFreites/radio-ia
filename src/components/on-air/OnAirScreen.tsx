"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export type OnAirMode =
  | "DJ_ACTIVE"
  | "DJ_PRESENTATION"
  | "IDLE"
  | "INTERRUPTION"
  | "ERROR";

export type OnAirScreenProps = {
  mode: OnAirMode;
  reloj: React.ReactNode;
  cover?: React.ReactNode;
  titulo?: string;
  subtitulo?: string;
  waveform?: React.ReactNode;
  proximoSlot?: React.ReactNode;
  controls?: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
};

export function OnAirScreen({
  mode,
  reloj,
  cover,
  titulo,
  subtitulo,
  waveform,
  proximoSlot,
  controls,
  sidebar,
  className,
}: OnAirScreenProps): React.ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLive = mode === "DJ_ACTIVE" || mode === "DJ_PRESENTATION" || mode === "INTERRUPTION";

  return (
    <div className={cn("relative min-h-screen bg-[color:var(--background)] text-[color:var(--text)]", className)}>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-28 pt-6 md:px-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          {isLive ? <Badge label="En vivo" pulse variant="live" /> : <Badge label="Idle" variant="idle" />}
          {sidebar ? (
            <button
              type="button"
              className="rounded-xl border border-[color:var(--border)] p-2 text-[color:var(--muted)] md:hidden"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Ver grilla de hoy"
            >
              {sidebarOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
          ) : null}
        </div>

        <div className="grid flex-1 gap-6 md:grid-cols-[1fr_320px]">
          <main className="flex flex-col items-center text-center">
            <div className="mb-6">{reloj}</div>
            {cover ? <div className="mb-6 w-full max-w-md">{cover}</div> : null}
            {titulo ? <h1 className="text-3xl font-bold md:text-4xl">{titulo}</h1> : null}
            {subtitulo ? <p className="mt-2 text-[color:var(--muted)]">{subtitulo}</p> : null}
            {waveform ? <div className="mt-8">{waveform}</div> : null}
            {proximoSlot ? <div className="mt-8 w-full max-w-lg">{proximoSlot}</div> : null}
            {mode === "ERROR" ? (
              <p className="mt-6 text-sm text-[color:var(--danger)]">Error en la transmisión. Revisá la consola.</p>
            ) : null}
          </main>

          {sidebar ? (
            <aside
              className={cn(
                "md:block",
                sidebarOpen
                  ? "fixed inset-0 z-20 bg-black/70 md:static md:bg-transparent"
                  : "hidden md:block",
              )}
            >
              <div
                className={cn(
                  "h-full overflow-y-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 md:max-h-[calc(100vh-8rem)]",
                  sidebarOpen ? "absolute right-0 top-0 w-[min(88vw,320px)]" : undefined,
                )}
              >
                {sidebar}
              </div>
            </aside>
          ) : null}
        </div>
      </div>

      {controls ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--border)] bg-[color:var(--background)]/90 backdrop-blur-xl">
          {controls}
        </div>
      ) : null}
    </div>
  );
}
