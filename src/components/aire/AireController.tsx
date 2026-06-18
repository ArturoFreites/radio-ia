"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AireDashboardPage } from "@/components/aire-dashboard/AireDashboardPage";
import { GrillaHoy } from "@/components/aire/GrillaHoy";
import { ModoDJ, type ModoDJHandle } from "@/components/aire/ModoDJ";
import { PublicidadDemoModal } from "@/components/aire/PublicidadDemoModal";
import { AironLogo } from "@/components/brand/AironLogo";
import { djConfigFromRow, djConfigSignature } from "@/lib/grilla/djConfigSchema";
import type { EstadoAire, ModoAire } from "@/types/grilla";

export type AireControllerProps = {
  radioId: string;
  radioNombre: string;
  aireToken: string;
  spotifySesionActiva: {
    sesionId: string;
    panelToken: string;
    playlistId: string;
    playlistNombre: string;
  } | null;
};

export function AireController({
  radioId: _radioId,
  radioNombre,
  aireToken,
  spotifySesionActiva,
}: AireControllerProps): React.ReactElement {
  void _radioId;
  const [estado, setEstado] = useState<EstadoAire | null>(null);

  const sesionActiva = useMemo(() => {
    if (estado === null) return spotifySesionActiva;
    return estado.spotifySesion;
  }, [estado, spotifySesionActiva]);

  const spotifyOk = Boolean(sesionActiva);
  const [modo, setModo] = useState<ModoAire>("IDLE");
  const [grillaMobile, setGrillaMobile] = useState(false);
  const [modalPublicidadDemo, setModalPublicidadDemo] = useState(false);
  const djRef = useRef<ModoDJHandle | null>(null);
  const slotTimeoutRef = useRef<number | null>(null);

  const fetchEstado = useCallback(async (): Promise<void> => {
    if (slotTimeoutRef.current !== null) {
      window.clearTimeout(slotTimeoutRef.current);
      slotTimeoutRef.current = null;
    }
    const res = await fetch(`/api/aire/estado?token=${encodeURIComponent(aireToken)}`);
    if (!res.ok) return;
    const data = (await res.json()) as EstadoAire;
    setEstado(data);
    const seg = data.segundosHastaFin;
    if (seg !== null && seg > 0) {
      slotTimeoutRef.current = window.setTimeout(() => {
        slotTimeoutRef.current = null;
        void fetchEstado();
      }, seg * 1000 + 500);
    }
  }, [aireToken]);

  useEffect(() => {
    void fetchEstado();
    const id = window.setInterval(() => void fetchEstado(), 10_000);
    return () => {
      window.clearInterval(id);
      if (slotTimeoutRef.current !== null) {
        window.clearTimeout(slotTimeoutRef.current);
        slotTimeoutRef.current = null;
      }
    };
  }, [fetchEstado]);

  const desiredModo = useMemo((): ModoAire => {
    if (!estado) return "IDLE";
    if (!estado.ahora) return spotifyOk ? "DJ" : "IDLE";
    return spotifyOk ? "DJ" : "IDLE";
  }, [estado, spotifyOk]);

  useEffect(() => {
    setModo(desiredModo);
  }, [desiredModo]);

  const slots = estado?.slotsDelDia ?? [];

  const mensajeIdle = useMemo((): string => {
    const ahora = estado?.ahora;
    if (!ahora) return "Sin programación activa";
    if (!ahora.playlistId) return "Modo DJ — sin playlist configurada en la grilla";
    if (estado?.sinSesionDj) return "Modo DJ — iniciá una sesión desde Spotify en el dashboard";
    if (!sesionActiva) return "Modo DJ — conectá Spotify en el dashboard";
    return "Modo DJ — controlá la música desde Spotify Connect (Airon)";
  }, [estado?.ahora, estado?.sinSesionDj, sesionActiva]);

  const slotActivo = estado?.ahora ?? null;
  const djConfigSig = slotActivo ? djConfigSignature(djConfigFromRow(slotActivo)) : null;

  const djConfig = useMemo((): ReturnType<typeof djConfigFromRow> | null => {
    if (!slotActivo) return null;
    return djConfigFromRow(slotActivo);
  }, [djConfigSig]);

  const voiceId = estado?.vozGeminiId ?? estado?.ahora?.voz1GeminiId ?? null;
  const djNombre = estado?.ahora?.voz1Nombre ?? "Airon";

  const reproducirAudioDemo = useCallback(
    async (blob: Blob): Promise<void> => {
      if (modo === "DJ") {
        await djRef.current?.fadeOutPause(1500);
      }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        void audio.play().catch(() => resolve());
      });
      URL.revokeObjectURL(url);

      if (modo === "DJ") {
        await djRef.current?.fadeInResume(1500);
      }
    },
    [modo],
  );

  const playbackArea =
    modo === "DJ" && sesionActiva && djConfig ? (
      <ModoDJ
        ref={djRef}
        sesionId={sesionActiva.sesionId}
        panelToken={sesionActiva.panelToken}
        playlistId={sesionActiva.playlistId}
        playlistNombre={sesionActiva.playlistNombre}
        radioNombre={radioNombre}
        aireToken={aireToken}
        voiceId={voiceId}
        djConfig={djConfig}
        presentacionCadaTemas={djConfig.presentacionCadaTemas}
        djNombre={djNombre}
        onAbrirCabina={() => setModalPublicidadDemo(true)}
      />
    ) : (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-4 px-6 text-center">
        <AironLogo size="lg" />
        <p className="text-xl font-semibold text-white">{radioNombre}</p>
        <p className="max-w-md text-[color:var(--muted)]">{mensajeIdle}</p>
      </div>
    );

  return (
    <div
      className="relative flex h-screen min-h-0 flex-col overflow-hidden"
      style={{ backgroundColor: "#0a0a0b" }}
    >
      <AireDashboardPage
        estado={estado}
        djConfig={djConfig}
        voiceId={voiceId}
        onDemoPublicidad={() => setModalPublicidadDemo(true)}
        playbackArea={playbackArea}
        radioNombre={radioNombre}
      />

      <button
        type="button"
        onClick={() => setGrillaMobile(true)}
        aria-label="Abrir grilla del día"
        className="fixed bottom-4 right-4 z-30 flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-md)] border border-[#2a2a2a] bg-[#0d0d0d] p-2.5 text-zinc-200 hover:border-[color:var(--primary)]/40 lg:hidden"
      >
        <svg
          className="h-5 w-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {grillaMobile ? (
        <GrillaHoy
          modoBottomSheet
          slots={slots}
          slotActivoId={estado?.ahora?.id ?? null}
          slotSiguienteId={estado?.siguiente?.id ?? null}
          onClose={() => setGrillaMobile(false)}
        />
      ) : null}

      <PublicidadDemoModal
        aireToken={aireToken}
        open={modalPublicidadDemo}
        onClose={() => setModalPublicidadDemo(false)}
        onReproducir={reproducirAudioDemo}
      />
    </div>
  );
}
