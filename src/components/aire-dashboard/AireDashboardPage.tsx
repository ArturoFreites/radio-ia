"use client";

import { AireLiveNowCard } from "@/components/aire-dashboard/AireLiveNowCard";
import { AirePlaybackQueue, type AireQueueTrack } from "@/components/aire-dashboard/AirePlaybackQueue";
import { AireRightPanel } from "@/components/aire-dashboard/AireRightPanel";
import { AireUpcomingPrograms } from "@/components/aire-dashboard/AireUpcomingPrograms";
import { InterrupcionesProgramadas } from "@/components/aire/InterrupcionesProgramadas";
import {
  buildUpcomingFromSlots,
  calcularProgresoSlot,
  formatHmsFromSeconds,
  formatSlotHorario,
  resolveDjNombre,
  resolveProgramaNombre,
} from "@/lib/aire-dashboard/slotHelpers";
import type { DjInterrupcionesConfig } from "@/lib/grilla/djConfigSchema";
import type { EstadoAire } from "@/types/grilla";

export type AireDashboardPageProps = {
  radioNombre: string;
  estado: EstadoAire | null;
  djConfig?: DjInterrupcionesConfig | null;
  voiceId?: string | null;
  queueTracks?: AireQueueTrack[];
  playbackArea?: React.ReactNode;
  onDemoPublicidad?: () => void;
};

export function AireDashboardPage({
  radioNombre,
  estado,
  djConfig = null,
  voiceId = null,
  queueTracks = [],
  playbackArea,
  onDemoPublicidad,
}: AireDashboardPageProps): React.ReactElement {
  const slotActivo = estado?.ahora ?? null;
  const spotifyActivo = Boolean(estado?.spotifySesion);
  const enVivo = Boolean(slotActivo) && spotifyActivo;
  const segundosRestantes = estado?.segundosHastaFin ?? null;

  const { elapsedSec, totalSec, progress } = calcularProgresoSlot(slotActivo, segundosRestantes);
  const upcoming = buildUpcomingFromSlots(estado?.slotsDelDia ?? [], slotActivo?.id ?? null);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 md:gap-6 md:p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">Cabina</h1>
          <p className="mt-0.5 text-sm text-[color:var(--muted)]">{radioNombre}</p>
        </div>
        {enVivo ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/10 px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--danger)] animate-airon-pulse-dot" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white">En vivo</span>
          </span>
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4 md:gap-6">
          {playbackArea ? (
            <div className="relative min-h-[320px] overflow-hidden rounded-[var(--r-2xl)]">
              {playbackArea}
            </div>
          ) : (
            <AireLiveNowCard
              djNombre={resolveDjNombre(slotActivo)}
              elapsedLabel={formatHmsFromSeconds(elapsedSec)}
              enVivo={enVivo}
              horario={slotActivo ? formatSlotHorario(slotActivo) : "—"}
              progress={progress}
              programaNombre={resolveProgramaNombre(slotActivo)}
              spotifyActivo={spotifyActivo}
              totalLabel={formatHmsFromSeconds(totalSec)}
            />
          )}

          <AirePlaybackQueue tracks={queueTracks} />
          <InterrupcionesProgramadas
            djConfig={djConfig}
            onDemoPublicidad={onDemoPublicidad}
            radioCiudad={estado?.radioCiudad}
          />
          <AireUpcomingPrograms programs={upcoming} />
        </div>

        <AireRightPanel
          djConfig={djConfig}
          onDemoPublicidad={onDemoPublicidad}
          radioCiudad={estado?.radioCiudad}
          segundosRestantes={segundosRestantes}
          spotifyActivo={spotifyActivo}
          transmitiendo={enVivo}
          voiceId={voiceId}
        />
      </div>
    </div>
  );
}
