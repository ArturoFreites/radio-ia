"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { SpotifyPlaybackState, SpotifyPlayer, SpotifySdkTrack } from "@/types/spotify-web-playback";
import { AireNowPlaying } from "@/components/aire/AireNowPlaying";
import { SpotifyIcon } from "@/components/brand/SpotifyIcon";
import { PresentacionOverlay } from "@/components/spotify/PresentacionOverlay";
import { fadeSpotifyPlayerVolume } from "@/lib/audio/fade";

/** Zona final del tema: reproducir diálogo o pausar hasta que el audio esté listo. */
const UMBRAL_BLOQUEO_MS = 12_000;
/** Si el worker o ElevenLabs no responden, reanudar reproducción. */
const TIMEOUT_ESPERA_PRESENTACION_MS = 25_000;
/** Tras este tiempo sin SSE, consultar estado por GET. */
const POLLING_FALLBACK_MS = 3_000;
const POLLING_INTERVAL_MS = 2_000;
/** Máximo de espera para la intro de apertura antes de arrancar Spotify. */
const TIMEOUT_INTRO_APERTURA_MS = 20_000;

export type SpotifyPanelHandle = {
  fadeOutPause: (totalMs?: number) => Promise<void>;
  fadeInResume: (totalMs?: number) => Promise<void>;
  skipToNextTrack: () => Promise<void>;
  estaOcupado: () => boolean;
};

type SpotifyPanelProps = {
  sesionId: string;
  panelToken: string;
  playlistId: string;
  playlistNombre: string;
  radioNombre: string;
  modo?: "standalone" | "aire";
  presentacionCadaTemas?: number;
  djNombre?: string;
  onAbrirCabina?: () => void;
};

async function fetchAccessToken(sesionId: string, panelToken: string): Promise<string> {
  const q = new URLSearchParams({ sesionId, token: panelToken });
  const res = await fetch(`/api/spotify/token?${q.toString()}`);
  if (!res.ok) throw new Error("No se pudo obtener token de Spotify");
  const data = (await res.json()) as { accessToken: string };
  return data.accessToken;
}

function loadSpotifySdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Spotify) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const prior = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => {
      prior?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://sdk.scdn.co/spotify-player.js";
    s.async = true;
    s.onerror = () => reject(new Error("No se pudo cargar Spotify SDK"));
    document.body.appendChild(s);
  });
}

async function spotifyApi(deviceId: string, accessToken: string, path: string, init: RequestInit): Promise<Response> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `https://api.spotify.com/v1${path}${sep}device_id=${encodeURIComponent(deviceId)}`;
  return fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

export const SpotifyPanel = forwardRef<SpotifyPanelHandle, SpotifyPanelProps>(function SpotifyPanel(
  {
    sesionId,
    panelToken,
    playlistId,
    playlistNombre,
    radioNombre,
    modo = "standalone",
    presentacionCadaTemas = 1,
    djNombre = "Airon",
    onAbrirCabina,
  },
  ref,
): React.ReactElement {
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const volumeRef = useRef(0.85);
  const accessTokenRef = useRef<string>("");
  const deviceIdRef = useRef<string>("");
  const presentacionEncoladaRef = useRef(false);
  const temasCountRef = useRef(0);
  const presentacionCadaTemasRef = useRef(presentacionCadaTemas);
  const transicionIniciadaRef = useRef(false);
  const trackAnteriorRef = useRef<string | null>(null);
  const audioUrlPresentacionRef = useRef<string | null>(null);
  const presentacionListaRef = useRef(false);
  const nextTrackIdRef = useRef<string | null>(null);
  const nextTrackMetaRef = useRef<SpotifySdkTrack | null>(null);
  /** Pausa cerca del final hasta que exista audio de presentación (o error). */
  const esperandoPresentacionRef = useRef(false);
  const esperaPresentacionDesdeRef = useRef(0);
  const pausaBloqueoSolicitadaRef = useRef(false);
  /** Si la generación falló para este track “siguiente”, no bloquear el avance. */
  const presentacionFallidaTrackIdRef = useRef<string | null>(null);
  const timeoutEsperaPresentacionRef = useRef<number | null>(null);
  const bloqueoTimeoutRef = useRef<number | null>(null);
  const lastStateTimestampRef = useRef(0);
  const lastPositionMsRef = useRef(0);
  const pausedRef = useRef(true);
  const durationMsRef = useRef(0);

  const sesionIdRef = useRef(sesionId);
  const panelTokenRef = useRef(panelToken);
  const playlistIdRef = useRef(playlistId);
  const radioNombreRef = useRef(radioNombre);
  const introAperturaIniciadaRef = useRef(false);

  useEffect(() => {
    sesionIdRef.current = sesionId;
    panelTokenRef.current = panelToken;
    playlistIdRef.current = playlistId;
    radioNombreRef.current = radioNombre;
  }, [sesionId, panelToken, playlistId, radioNombre]);

  const [sdkError, setSdkError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [current, setCurrent] = useState<SpotifySdkTrack | null>(null);
  const [nextTrack, setNextTrack] = useState<SpotifySdkTrack | null>(null);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [paused, setPaused] = useState(true);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayTrack, setOverlayTrack] = useState<SpotifySdkTrack | null>(null);
  const [overlayTitulo, setOverlayTitulo] = useState<string | undefined>(undefined);
  const [audioProgress, setAudioProgress] = useState(0);
  const [presentacionEstado, setPresentacionEstado] = useState<"idle" | "generando" | "lista">("idle");
  const [dialogoReproduciendo, setDialogoReproduciendo] = useState(false);
  const [coverImagenFallida, setCoverImagenFallida] = useState(false);
  const [nextCoverImagenFallida, setNextCoverImagenFallida] = useState(false);
  const [volumeUi, setVolumeUi] = useState(0.85);
  const [autoDj, setAutoDj] = useState(true);

  const limpiarTimeoutEspera = useCallback((): void => {
    if (timeoutEsperaPresentacionRef.current !== null) {
      window.clearTimeout(timeoutEsperaPresentacionRef.current);
      timeoutEsperaPresentacionRef.current = null;
    }
  }, []);

  const limpiarBloqueoTimeout = useCallback((): void => {
    if (bloqueoTimeoutRef.current !== null) {
      window.clearTimeout(bloqueoTimeoutRef.current);
      bloqueoTimeoutRef.current = null;
    }
  }, []);

  const desbloquearEsperaPresentacion = useCallback(
    (trackId: string, opts?: { idle?: boolean }): void => {
      limpiarTimeoutEspera();
      presentacionFallidaTrackIdRef.current = trackId;
      esperandoPresentacionRef.current = false;
      pausaBloqueoSolicitadaRef.current = false;
      void playerRef.current?.resume().catch(() => undefined);
      if (opts?.idle) setPresentacionEstado("idle");
    },
    [limpiarTimeoutEspera],
  );

  const iniciarTimeoutEsperaPresentacion = useCallback((): void => {
    limpiarTimeoutEspera();
    timeoutEsperaPresentacionRef.current = window.setTimeout(() => {
      timeoutEsperaPresentacionRef.current = null;
      if (!esperandoPresentacionRef.current) return;
      const trackId = nextTrackIdRef.current;
      if (trackId) desbloquearEsperaPresentacion(trackId);
      else {
        esperandoPresentacionRef.current = false;
        pausaBloqueoSolicitadaRef.current = false;
        void playerRef.current?.resume().catch(() => undefined);
      }
    }, TIMEOUT_ESPERA_PRESENTACION_MS);
  }, [desbloquearEsperaPresentacion, limpiarTimeoutEspera]);

  const refrescarToken = useCallback(async (): Promise<string> => {
    const t = await fetchAccessToken(sesionIdRef.current, panelTokenRef.current);
    accessTokenRef.current = t;
    return t;
  }, []);

  const reproducirAudioUrl = useCallback(async (url: string): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      audio.addEventListener("timeupdate", () => {
        if (audio.duration) setAudioProgress(audio.currentTime / audio.duration);
      });
      audio.addEventListener("ended", () => resolve());
      audio.addEventListener("error", () => reject(new Error("audio")));
      setDialogoReproduciendo(true);
      void audio.play().catch(() => reject(new Error("play")));
    });
  }, []);

  const ejecutarIntroApertura = useCallback(async (): Promise<void> => {
    const postIntro = async (): Promise<string | null> => {
      try {
        const res = await fetch(`/api/spotify/sesion/${sesionIdRef.current}/intro-apertura`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            panelToken: panelTokenRef.current,
            playlistId: playlistIdRef.current,
          }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { audioUrl?: string | null };
        return data.audioUrl ?? null;
      } catch {
        return null;
      }
    };

    const audioUrl = await Promise.race([
      postIntro(),
      new Promise<null>((resolve) => {
        window.setTimeout(() => resolve(null), TIMEOUT_INTRO_APERTURA_MS);
      }),
    ]);

    if (!audioUrl) return;

    setOverlayTrack(null);
    setOverlayTitulo(radioNombreRef.current);
    setOverlayVisible(true);
    setAudioProgress(0);

    try {
      await reproducirAudioUrl(audioUrl);
    } catch {
      /* arrancar Spotify aunque falle la reproducción */
    } finally {
      setDialogoReproduciendo(false);
      setOverlayVisible(false);
      setOverlayTitulo(undefined);
      setAudioProgress(0);
    }
  }, [reproducirAudioUrl]);

  useEffect(() => {
    presentacionCadaTemasRef.current = Math.max(1, presentacionCadaTemas);
  }, [presentacionCadaTemas]);

  const debePresentarAhora = useCallback((): boolean => {
    const n = presentacionCadaTemasRef.current;
    return temasCountRef.current > 0 && temasCountRef.current % n === 0;
  }, []);

  const saltarSinPresentacion = useCallback(async (): Promise<void> => {
    const player = playerRef.current;
    if (!player || transicionIniciadaRef.current) return;
    transicionIniciadaRef.current = true;
    limpiarTimeoutEspera();
    limpiarBloqueoTimeout();
    esperandoPresentacionRef.current = false;
    pausaBloqueoSolicitadaRef.current = false;
    presentacionEncoladaRef.current = false;
    presentacionListaRef.current = false;
    audioUrlPresentacionRef.current = null;
    try {
      await player.nextTrack();
      await player.resume();
    } catch {
      /* ignore */
    } finally {
      transicionIniciadaRef.current = false;
      setPresentacionEstado("idle");
    }
  }, [limpiarBloqueoTimeout, limpiarTimeoutEspera]);

  const runTransicion = useCallback(async (): Promise<void> => {
    const player = playerRef.current;
    if (!player || transicionIniciadaRef.current) return;
    transicionIniciadaRef.current = true;

    const url = audioUrlPresentacionRef.current;
    if (!url || !presentacionListaRef.current) {
      transicionIniciadaRef.current = false;
      return;
    }

    try {
      await fadeSpotifyPlayerVolume(player, volumeRef.current, 0, 3000);
      volumeRef.current = 0;
      await player.pause();
      setOverlayTitulo(undefined);
      setOverlayTrack(nextTrackMetaRef.current);
      setOverlayVisible(true);
      setAudioProgress(0);

      await reproducirAudioUrl(url);
    } catch {
      /* sin diálogo si falla el audio */
    } finally {
      setDialogoReproduciendo(false);
    }

    setOverlayVisible(false);
    setAudioProgress(0);
    await player.nextTrack();
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 500);
    });
    await player.resume();
    await fadeSpotifyPlayerVolume(player, 0, 0.85, 2000);
    volumeRef.current = 0.85;

    presentacionListaRef.current = false;
    audioUrlPresentacionRef.current = null;
    presentacionEncoladaRef.current = false;
    transicionIniciadaRef.current = false;
    esperandoPresentacionRef.current = false;
    pausaBloqueoSolicitadaRef.current = false;
    limpiarTimeoutEspera();
    limpiarBloqueoTimeout();
    setPresentacionEstado("idle");
  }, [limpiarBloqueoTimeout, limpiarTimeoutEspera, reproducirAudioUrl]);

  const manejarRespuestaPresentacion = useCallback(
    (trackId: string, data: { estado?: string; audioUrl?: string }): void => {
      if (data.estado === "LISTA" && data.audioUrl) {
        limpiarTimeoutEspera();
        audioUrlPresentacionRef.current = data.audioUrl;
        presentacionListaRef.current = true;
        setPresentacionEstado("lista");
        if (esperandoPresentacionRef.current) {
          esperandoPresentacionRef.current = false;
          void runTransicion();
        }
        return;
      }
      if (data.estado === "LISTA") {
        desbloquearEsperaPresentacion(trackId, { idle: true });
        return;
      }
      if (data.estado === "ERROR") {
        desbloquearEsperaPresentacion(trackId);
      }
    },
    [desbloquearEsperaPresentacion, limpiarTimeoutEspera, runTransicion],
  );

  const pedirPresentacion = useCallback(
    async (track: SpotifySdkTrack): Promise<void> => {
      setPresentacionEstado("generando");
      const coverUrl = track.album.images[0]?.url ?? null;
      try {
        const res = await fetch(`/api/spotify/sesion/${sesionIdRef.current}/presentacion`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackSpotifyId: track.id,
            panelToken: panelTokenRef.current,
            trackNombre: track.name,
            artistaNombre: track.artists.map((a) => a.name).join(", "),
            albumNombre: track.album.name,
            duracionMs: track.duration_ms,
            coverUrl,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { estado?: string; audioUrl?: string };
        manejarRespuestaPresentacion(track.id, data);
      } catch {
        /* el timeout de seguridad cubre bloqueos si el POST falla en red */
      }
    },
    [manejarRespuestaPresentacion],
  );

  const consultarEstadoPresentacion = useCallback(async (): Promise<void> => {
    const trackId = nextTrackIdRef.current;
    if (!trackId || !esperandoPresentacionRef.current || presentacionListaRef.current) return;
    if (Date.now() - esperaPresentacionDesdeRef.current < POLLING_FALLBACK_MS) return;

    const q = new URLSearchParams({
      trackSpotifyId: trackId,
      token: panelTokenRef.current,
    });
    try {
      const res = await fetch(
        `/api/spotify/sesion/${encodeURIComponent(sesionIdRef.current)}/presentacion?${q.toString()}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { estado?: string; audioUrl?: string };
      manejarRespuestaPresentacion(trackId, data);
    } catch {
      /* el timeout de seguridad cubre fallos de red */
    }
  }, [manejarRespuestaPresentacion]);

  const dispararBloqueo = useCallback((): void => {
    const player = playerRef.current;
    if (!player || transicionIniciadaRef.current) return;
    const trackSiguienteId = nextTrackIdRef.current;
    if (!trackSiguienteId || presentacionFallidaTrackIdRef.current === trackSiguienteId) return;

    if (!debePresentarAhora()) {
      void saltarSinPresentacion();
      return;
    }

    if (presentacionListaRef.current) {
      void runTransicion();
    } else if (!pausaBloqueoSolicitadaRef.current) {
      pausaBloqueoSolicitadaRef.current = true;
      esperandoPresentacionRef.current = true;
      esperaPresentacionDesdeRef.current = Date.now();
      void player.pause().catch(() => undefined);
      iniciarTimeoutEsperaPresentacion();
    }
  }, [debePresentarAhora, iniciarTimeoutEsperaPresentacion, runTransicion, saltarSinPresentacion]);

  const onManualSkip = useCallback(async (): Promise<void> => {
    const player = playerRef.current;
    if (!player) return;
    limpiarTimeoutEspera();
    limpiarBloqueoTimeout();
    esperandoPresentacionRef.current = false;
    pausaBloqueoSolicitadaRef.current = false;
    if (presentacionListaRef.current && audioUrlPresentacionRef.current) {
      transicionIniciadaRef.current = false;
      await runTransicion();
    } else {
      await player.nextTrack();
    }
  }, [limpiarBloqueoTimeout, limpiarTimeoutEspera, runTransicion]);

  useImperativeHandle(
    ref,
    () => ({
      fadeOutPause: async (totalMs = 2500): Promise<void> => {
        const player = playerRef.current;
        if (!player) return;
        let from = volumeRef.current;
        try {
          const live = await player.getVolume();
          if (typeof live === "number") from = live;
        } catch {
          /* usar volumeRef */
        }
        await fadeSpotifyPlayerVolume(player, from, 0, totalMs);
        volumeRef.current = 0;
        await player.pause();
      },
      fadeInResume: async (totalMs = 2500): Promise<void> => {
        const player = playerRef.current;
        if (!player) return;
        await player.activateElement().catch(() => undefined);
        await player.resume().catch(() => undefined);
        const target = 0.85;
        await fadeSpotifyPlayerVolume(player, 0, target, totalMs);
        volumeRef.current = target;
      },
      skipToNextTrack: (): Promise<void> => onManualSkip(),
      estaOcupado: (): boolean => transicionIniciadaRef.current || esperandoPresentacionRef.current,
    }),
    [onManualSkip],
  );

  useEffect(() => {
    introAperturaIniciadaRef.current = false;
    let cancelled = false;
    const tokenInterval = window.setInterval(() => {
      void refrescarToken();
    }, 50 * 60 * 1000);

    void (async () => {
      try {
        const token = await refrescarToken();
        if (cancelled) return;
        await loadSpotifySdk();
        if (cancelled || !window.Spotify) {
          setSdkError("No se pudo cargar el reproductor de Spotify.");
          return;
        }

        const player = new window.Spotify.Player({
          name: modo === "aire" ? "Airon Aire" : "Airon OBS",
          getOAuthToken: (cb) => {
            void refrescarToken().then((t) => cb(t));
          },
          volume: 0.85,
        });
        volumeRef.current = 0.85;
        playerRef.current = player;

        player.addListener("initialization_error", ({ message }) => {
          setInitError(message || "Error de inicialización (¿Spotify Premium?)");
        });
        player.addListener("authentication_error", ({ message }) => {
          setInitError(message || "Error de autenticación con Spotify");
        });
        player.addListener("account_error", ({ message }) => {
          setInitError(message || "Se requiere Spotify Premium para el reproductor en el navegador.");
        });
        player.addListener("playback_error", ({ message }) => {
          console.error("Spotify playback_error:", message);
        });
        player.addListener("not_ready", () => {
          setInitError("El reproductor de Spotify se desconectó. Reintentando…");
        });
        player.addListener("autoplay_failed", () => {
          setInitError("El navegador bloqueó el autoplay. Hacé clic en Reproducir para iniciar.");
        });

        player.addListener("ready", async ({ device_id }) => {
          if (introAperturaIniciadaRef.current) return;
          introAperturaIniciadaRef.current = true;

          deviceIdRef.current = device_id;
          const t = accessTokenRef.current || token;

          await ejecutarIntroApertura();

          try {
            const targetVolume = volumeRef.current;
            await player.setVolume(0);
            volumeRef.current = 0;

            await spotifyApi(device_id, t, "/me/player", {
              method: "PUT",
              body: JSON.stringify({ device_ids: [device_id], play: false }),
            });
            await spotifyApi(device_id, t, "/me/player/play", {
              method: "PUT",
              body: JSON.stringify({ context_uri: playlistId, offset: { position: 0 } }),
            });

            await fadeSpotifyPlayerVolume(player, 0, targetVolume, 2500);
            volumeRef.current = targetVolume;
          } catch {
            setInitError("No se pudo iniciar la reproducción. Comprobá Spotify Connect.");
          }
        });

        player.addListener("player_state_changed", (state: SpotifyPlaybackState | null) => {
          if (!state) return;
          const { position, duration, paused: isPaused, track_window } = state;
          const msRestantes = duration - position;
          const trackActual = track_window.current_track;
          const trackSiguiente = track_window.next_tracks[0] ?? null;

          lastPositionMsRef.current = position;
          lastStateTimestampRef.current = Date.now();
          pausedRef.current = isPaused;
          durationMsRef.current = duration;
          setPositionMs(position);
          setDurationMs(duration);
          setPaused(isPaused);
          setCurrent(trackActual);
          setNextTrack(trackSiguiente);
          if (trackSiguiente) {
            nextTrackIdRef.current = trackSiguiente.id;
            nextTrackMetaRef.current = trackSiguiente;
          }

          if (msRestantes > UMBRAL_BLOQUEO_MS + 2_000) {
            pausaBloqueoSolicitadaRef.current = false;
            esperandoPresentacionRef.current = false;
            limpiarTimeoutEspera();
            limpiarBloqueoTimeout();
          }

          if (trackActual?.id) {
            const prev = trackAnteriorRef.current;
            if (prev !== null && trackActual.id !== prev) {
              temasCountRef.current += 1;
              presentacionEncoladaRef.current = false;
              transicionIniciadaRef.current = false;
              presentacionListaRef.current = false;
              audioUrlPresentacionRef.current = null;
              esperandoPresentacionRef.current = false;
              pausaBloqueoSolicitadaRef.current = false;
              limpiarTimeoutEspera();
              limpiarBloqueoTimeout();
              if (presentacionFallidaTrackIdRef.current === trackActual.id) {
                presentacionFallidaTrackIdRef.current = null;
              }
              setPresentacionEstado("idle");
              setDialogoReproduciendo(false);
            }
            trackAnteriorRef.current = trackActual.id;
          }

          // Encolar generación del diálogo en cuanto Spotify expone el siguiente tema
          // (p. ej. al arrancar el primero), no solo en el último minuto y medio.
          if (trackSiguiente && !presentacionEncoladaRef.current && debePresentarAhora()) {
            presentacionEncoladaRef.current = true;
            void pedirPresentacion(trackSiguiente);
          }

          const msHastaBloqueo = msRestantes - UMBRAL_BLOQUEO_MS;
          const puedeProgramarBloqueo =
            trackSiguiente &&
            presentacionFallidaTrackIdRef.current !== trackSiguiente.id &&
            !pausaBloqueoSolicitadaRef.current &&
            !transicionIniciadaRef.current;

          if (puedeProgramarBloqueo && msHastaBloqueo > 0) {
            limpiarBloqueoTimeout();
            bloqueoTimeoutRef.current = window.setTimeout(() => {
              bloqueoTimeoutRef.current = null;
              dispararBloqueo();
            }, msHastaBloqueo);
          }

          const bloqueoActivo = puedeProgramarBloqueo && msRestantes <= UMBRAL_BLOQUEO_MS;

          if (bloqueoActivo) {
            limpiarBloqueoTimeout();
            dispararBloqueo();
          }
        });

        const ok = await player.connect();
        void player.activateElement().catch(() => undefined);
        if (!ok && !cancelled) setInitError("No se pudo conectar el reproductor");
      } catch {
        if (!cancelled) setSdkError("Error al iniciar sesión con Spotify.");
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(tokenInterval);
      limpiarTimeoutEspera();
      limpiarBloqueoTimeout();
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [
    dispararBloqueo,
    ejecutarIntroApertura,
    iniciarTimeoutEsperaPresentacion,
    limpiarBloqueoTimeout,
    limpiarTimeoutEspera,
    pedirPresentacion,
    playlistId,
    refrescarToken,
    runTransicion,
    modo,
    sesionId,
  ]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      const duration = durationMsRef.current;
      if (!duration || lastStateTimestampRef.current === 0) return;
      const elapsed = Date.now() - lastStateTimestampRef.current;
      const estimado = Math.max(0, Math.min(lastPositionMsRef.current + elapsed, duration));
      setPositionMs(estimado);
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const pollId = window.setInterval(() => {
      void consultarEstadoPresentacion();
    }, POLLING_INTERVAL_MS);
    return () => window.clearInterval(pollId);
  }, [consultarEstadoPresentacion]);

  useEffect(() => {
    const es = new EventSource(
      `/api/spotify/sesion/${encodeURIComponent(sesionId)}/eventos?token=${encodeURIComponent(panelToken)}`,
    );
    es.onmessage = (e) => {
      try {
        const evento = JSON.parse(e.data) as {
          tipo: string;
          trackSpotifyId?: string;
          audioUrl?: string;
        };
        if (evento.tipo === "PRESENTACION_LISTA" && evento.trackSpotifyId && evento.audioUrl) {
          if (evento.trackSpotifyId === nextTrackIdRef.current) {
            manejarRespuestaPresentacion(evento.trackSpotifyId, {
              estado: "LISTA",
              audioUrl: evento.audioUrl,
            });
          }
        }
        if (evento.tipo === "PRESENTACION_ERROR" && evento.trackSpotifyId) {
          if (evento.trackSpotifyId === nextTrackIdRef.current) {
            manejarRespuestaPresentacion(evento.trackSpotifyId, { estado: "ERROR" });
          }
        }
        if (evento.tipo === "TOKEN_REFRESH") {
          void refrescarToken();
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [manejarRespuestaPresentacion, refrescarToken, sesionId, panelToken]);

  const fmt = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const togglePlay = async (): Promise<void> => {
    const player = playerRef.current;
    if (!player) return;
    await player.activateElement().catch(() => undefined);
    const st = await player.getCurrentState();
    if (st?.paused) await player.resume();
    else await player.pause();
  };

  const cambiarVolumen = useCallback(async (v: number): Promise<void> => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeUi(clamped);
    volumeRef.current = clamped;
    const player = playerRef.current;
    if (player) await player.setVolume(clamped).catch(() => undefined);
  }, []);

  const rootClass =
    modo === "aire"
      ? "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit] bg-transparent text-zinc-100"
      : "min-h-screen bg-zinc-950 p-6 text-zinc-100";

  const coverUrl = current?.album.images[0]?.url;

  const nextCoverUrl = nextTrack?.album.images[0]?.url;

  useEffect(() => {
    setCoverImagenFallida(false);
  }, [coverUrl]);

  useEffect(() => {
    setNextCoverImagenFallida(false);
  }, [nextCoverUrl]);

  return (
    <div className={rootClass}>
      <PresentacionOverlay
        visible={overlayVisible}
        track={overlayTrack}
        audioProgress={audioProgress}
        titulo={overlayTitulo}
        scoped={modo === "aire"}
      />

      {modo === "standalone" ? (
        <header className="mb-6 flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <SpotifyIcon size="sm" />
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Modo DJ</span>
          </div>
          <h1 className="text-lg font-medium text-white">{playlistNombre}</h1>
        </header>
      ) : null}

      {(sdkError || initError) && (
        <div className="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          {sdkError ?? initError}
          <p className="mt-2 text-xs text-amber-300/80">Se requiere Spotify Premium para el reproductor en el navegador.</p>
        </div>
      )}

      {modo === "aire" ? (
        <AireNowPlaying
          djNombre={djNombre}
          playlistNombre={playlistNombre}
          trackNombre={current?.name ?? null}
          artistaNombre={current?.artists.map((a) => a.name).join(", ") ?? null}
          coverUrl={coverUrl ?? null}
          coverFallida={coverImagenFallida}
          onCoverError={() => setCoverImagenFallida(true)}
          positionMs={positionMs}
          durationMs={durationMs}
          paused={paused}
          presentacionEstado={presentacionEstado}
          dialogoReproduciendo={dialogoReproduciendo}
          nextTrackNombre={nextTrack?.name ?? null}
          nextArtistaNombre={nextTrack?.artists.map((a) => a.name).join(", ") ?? null}
          nextCoverUrl={nextCoverUrl ?? null}
          nextCoverFallida={nextCoverImagenFallida}
          onNextCoverError={() => setNextCoverImagenFallida(true)}
          segundosHastaNext={durationMs > 0 ? Math.ceil((durationMs - positionMs) / 1000) : null}
          volume={volumeUi}
          onVolumeChange={(v) => void cambiarVolumen(v)}
          onTogglePlay={() => void togglePlay()}
          onSkip={() => void onManualSkip()}
          onAbrirCabina={onAbrirCabina}
          autoDj={autoDj}
          onToggleAutoDj={() => setAutoDj((a) => !a)}
        />
      ) : null}

      {modo === "standalone" ? (
        <div className="grid gap-8 md:grid-cols-[minmax(0,280px)_1fr]">
          <div>
            {coverUrl && !coverImagenFallida ? (
              <div className="aspect-square w-full overflow-hidden">
                <img
                  src={coverUrl}
                  alt=""
                  className="h-full w-full rounded-xl object-cover"
                  onError={() => setCoverImagenFallida(true)}
                />
              </div>
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-zinc-900 text-6xl">
                ♪
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col justify-center">
            <p className="text-sm font-medium text-amber-400">Sonando ahora</p>
            <h2 className="mt-1 text-2xl font-bold text-white">{current?.name ?? "—"}</h2>
            <p className="mt-1 text-zinc-400">
              {current?.artists.map((a) => a.name).join(", ") ?? ""}
              {current?.album.name ? ` — ${current.album.name}` : ""}
            </p>
            <div className="mt-6">
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-amber-500 transition-[width] duration-300 ease-out"
                  style={{ width: durationMs ? `${(positionMs / durationMs) * 100}%` : "0%" }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-zinc-500">
                <span>{fmt(positionMs)}</span>
                <span>{fmt(durationMs)}</span>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => void togglePlay()}
                className="rounded-full bg-amber-500 px-6 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
              >
                {paused ? "Reproducir" : "Pausa"}
              </button>
              <button
                type="button"
                onClick={() => void onManualSkip()}
                className="rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modo === "standalone" ?
        <footer className="mt-10 border-t border-zinc-800 pt-6 text-sm text-zinc-400">
          <p>
            <span className="text-zinc-500">Siguiente:</span>{" "}
            {nextTrack ? `“${nextTrack.name}” — ${nextTrack.artists.map((a) => a.name).join(", ")}` : "—"}
          </p>
          <p className="mt-2">
            <span className="text-zinc-500">Presentación:</span>{" "}
            {presentacionEstado === "lista" ? "Lista" : presentacionEstado === "generando" ? "Generando…" : "—"}
          </p>
        </footer>
      : null}
    </div>
  );
});
SpotifyPanel.displayName = "SpotifyPanel";
