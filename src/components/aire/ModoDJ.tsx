"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { DjInterrupcionOverlay } from "@/components/aire/DjInterrupcionOverlay";
import { SpotifyPanel, type SpotifyPanelHandle } from "@/components/spotify/SpotifyPanel";
import { useDjInterrupciones } from "@/hooks/useDjInterrupciones";
import type { DjInterrupcionesConfig } from "@/lib/grilla/djConfigSchema";
import type { TipoInterrupcionDj } from "@/types/grilla";

export type ModoDJHandle = {
  fadeOutPause: (totalMs?: number) => Promise<void>;
  fadeInResume: (totalMs?: number) => Promise<void>;
  skipToNextTrack: () => Promise<void>;
  transicionarSlot: (params: {
    playlistId: string;
    playlistNombre: string;
    audioUrl: string | null;
    djNombre?: string;
  }) => Promise<void>;
};

type ModoDJProps = {
  sesionId: string;
  panelToken: string;
  playlistId: string;
  playlistNombre: string;
  radioNombre: string;
  aireToken: string;
  voiceId: string | null;
  slotInicioMs: number | null;
  djConfig: DjInterrupcionesConfig;
  presentacionCadaTemas: number;
  djNombre?: string;
  onAbrirCabina?: () => void;
};

export const ModoDJ = forwardRef<ModoDJHandle, ModoDJProps>(function ModoDJ(
  {
    sesionId,
    panelToken,
    playlistId,
    playlistNombre,
    radioNombre,
    aireToken,
    voiceId,
    slotInicioMs,
    djConfig,
    presentacionCadaTemas,
    djNombre,
    onAbrirCabina,
  },
  ref,
): React.ReactElement {
  const spotifyRef = useRef<SpotifyPanelHandle>(null);
  const [overlayTipo, setOverlayTipo] = useState<TipoInterrupcionDj | null>(null);
  const [overlaySubtitulo, setOverlaySubtitulo] = useState<string | undefined>();

  useImperativeHandle(
    ref,
    () => ({
      fadeOutPause: async (totalMs?: number): Promise<void> => {
        await spotifyRef.current?.fadeOutPause(totalMs);
      },
      fadeInResume: async (totalMs?: number): Promise<void> => {
        await spotifyRef.current?.fadeInResume(totalMs);
      },
      skipToNextTrack: async (): Promise<void> => {
        await spotifyRef.current?.skipToNextTrack();
      },
      transicionarSlot: async (params): Promise<void> => {
        await spotifyRef.current?.transicionarSlot(params);
      },
    }),
    [],
  );

  const onOverlay = useCallback((tipo: TipoInterrupcionDj | null, subtitulo?: string): void => {
    setOverlayTipo(tipo);
    setOverlaySubtitulo(subtitulo);
  }, []);

  const isBusy = useCallback((): boolean => spotifyRef.current?.estaOcupado() ?? false, []);

  useDjInterrupciones({
    aireToken,
    config: djConfig,
    voiceId,
    slotInicioMs,
    enabled: Boolean(voiceId) || Boolean(djConfig?.djAudioActiva && djConfig.djAudioCarpetaId),
    onBeforePlay: async (): Promise<void> => {
      await spotifyRef.current?.fadeOutPause(1500);
    },
    onAfterPlay: async (): Promise<void> => {
      await spotifyRef.current?.fadeInResume(1500);
    },
    onOverlay,
    isBusy,
  });

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]">
      <SpotifyPanel
        ref={spotifyRef}
        sesionId={sesionId}
        panelToken={panelToken}
        playlistId={playlistId}
        playlistNombre={playlistNombre}
        radioNombre={radioNombre}
        modo="aire"
        presentacionCadaTemas={presentacionCadaTemas}
        djNombre={djNombre}
        onAbrirCabina={onAbrirCabina}
      />
      <DjInterrupcionOverlay
        visible={overlayTipo !== null}
        tipo={overlayTipo}
        subtitulo={overlaySubtitulo}
        scoped
      />
    </div>
  );
});
