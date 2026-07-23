"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  calcularProximaInterrupcion,
  claveCacheInterrupcion,
  msHastaPrepararInterrupcion,
  siguienteIndicePublicidad,
  type ProximaInterrupcionDj,
  type UltimaEjecucionMap,
} from "@/lib/aire/djInterrupciones";
import { elegirSiguienteIndiceAudio, type AudioRotacionItem } from "@/lib/audios/rotacion";
import { djConfigSignature, type DjInterrupcionesConfig } from "@/lib/grilla/djConfigSchema";
import type { DjInterrupcionAudiosResponse, TipoInterrupcionDj } from "@/types/grilla";

type PublicidadItem = { id: string; nombre: string; tieneAudio: boolean };

type PreparedInterrupcion = {
  blob: Blob;
  subtitulo?: string;
  publicidadId?: string;
  audioId?: string;
};

type UseDjInterrupcionesParams = {
  aireToken: string;
  config: DjInterrupcionesConfig | null;
  voiceId: string | null;
  slotInicioMs: number | null;
  enabled: boolean;
  onBeforePlay: () => Promise<void>;
  onAfterPlay: () => Promise<void>;
  onOverlay: (tipo: TipoInterrupcionDj | null, subtitulo?: string) => void;
  isBusy: () => boolean;
};

function sincronizarUltimasDesdeConfig(
  ultimas: UltimaEjecucionMap,
  config: DjInterrupcionesConfig,
  now: number,
): void {
  if (!config.djHoraActiva) delete ultimas.HORA;
  if (config.djClimaActivo) ultimas.CLIMA = now;
  else delete ultimas.CLIMA;
  if (config.djPublicidadActiva) ultimas.PUBLICIDAD = now;
  else delete ultimas.PUBLICIDAD;
  if (config.djAudioActiva) ultimas.AUDIO = now;
  else delete ultimas.AUDIO;
}

function resolverPublicidad(
  publicidades: PublicidadItem[],
  index: number,
): { publicidadId: string; subtitulo: string } | null {
  const item = publicidades[index];
  if (!item) return null;
  return { publicidadId: item.id, subtitulo: item.nombre };
}

export function useDjInterrupciones({
  aireToken,
  config,
  voiceId,
  slotInicioMs,
  enabled,
  onBeforePlay,
  onAfterPlay,
  onOverlay,
  isBusy,
}: UseDjInterrupcionesParams): void {
  const ultimasRef = useRef<UltimaEjecucionMap>({});
  const timerRef = useRef<number | null>(null);
  const prepTimerRef = useRef<number | null>(null);
  const publicidadesRef = useRef<PublicidadItem[]>([]);
  const publicidadIndexRef = useRef(0);
  const audiosRef = useRef<AudioRotacionItem[]>([]);
  const audioIndexRef = useRef(-1);
  const ultimoAudioIdRef = useRef<string | null>(null);
  const audioModoRef = useRef<"SECUENCIAL" | "ALEATORIO">("SECUENCIAL");
  const carpetaNombreRef = useRef("Audio");
  const runningRef = useRef(false);
  const preparedRef = useRef<Map<string, PreparedInterrupcion>>(new Map());
  const prepPromisesRef = useRef<Map<string, Promise<PreparedInterrupcion | null>>>(new Map());
  const configRef = useRef(config);
  const configSigRef = useRef("");
  const slotInicioSigRef = useRef("");
  const slotInicioRef = useRef<number | null>(null);
  const voiceIdRef = useRef(voiceId);
  const programarRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    slotInicioRef.current = slotInicioMs;
  }, [slotInicioMs]);

  useEffect(() => {
    voiceIdRef.current = voiceId;
  }, [voiceId]);

  const configSig = config ? djConfigSignature(config) : "";
  const carpetaId = config?.djAudioCarpetaId ?? null;

  useEffect(() => {
    if (!enabled || !configSig) return undefined;
    void fetch(`/api/aire/dj-interrupcion/publicidad?token=${encodeURIComponent(aireToken)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { publicidades?: PublicidadItem[] } | null) => {
        publicidadesRef.current = data?.publicidades ?? [];
      })
      .catch(() => {
        publicidadesRef.current = [];
      });
    return undefined;
  }, [aireToken, enabled, configSig]);

  useEffect(() => {
    if (!enabled || !carpetaId) {
      audiosRef.current = [];
      return undefined;
    }
    void fetch(
      `/api/aire/dj-interrupcion/audios?token=${encodeURIComponent(aireToken)}&carpetaId=${encodeURIComponent(carpetaId)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: DjInterrupcionAudiosResponse | null) => {
        audiosRef.current = data?.archivos ?? [];
        audioModoRef.current = data?.modoRotacion ?? "SECUENCIAL";
        carpetaNombreRef.current = data?.carpetaNombre ?? "Audio";
        audioIndexRef.current = -1;
        ultimoAudioIdRef.current = null;
      })
      .catch(() => {
        audiosRef.current = [];
      });
    return undefined;
  }, [aireToken, enabled, carpetaId, configSig]);

  const limpiarPreparacion = useCallback((): void => {
    if (prepTimerRef.current !== null) {
      window.clearTimeout(prepTimerRef.current);
      prepTimerRef.current = null;
    }
    preparedRef.current.clear();
    prepPromisesRef.current.clear();
  }, []);

  const prepararInterrupcionTts = useCallback(
    async (
      tipo: TipoInterrupcionDj,
      publicidadId?: string,
      subtitulo?: string,
      horaObjetivoMs?: number,
    ): Promise<PreparedInterrupcion | null> => {
      const voz = voiceIdRef.current;
      if (!voz) return null;
      if (tipo === "PUBLICIDAD" && !publicidadId) return null;

      const cacheKey = claveCacheInterrupcion(tipo, publicidadId, horaObjetivoMs);
      const cached = preparedRef.current.get(cacheKey);
      if (cached) return cached;

      const inflight = prepPromisesRef.current.get(cacheKey);
      if (inflight) return inflight;

      const promise = (async (): Promise<PreparedInterrupcion | null> => {
        try {
          const res = await fetch("/api/aire/dj-interrupcion/preparar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              aireToken,
              tipo,
              voiceId: voz,
              publicidadId,
              horaObjetivoMs,
            }),
          });
          const contentType = res.headers.get("content-type") ?? "";
          if (!res.ok || !contentType.startsWith("audio/")) return null;
          const blob = await res.blob();
          const prepared: PreparedInterrupcion = { blob, subtitulo, publicidadId };
          preparedRef.current.set(cacheKey, prepared);
          return prepared;
        } catch {
          return null;
        } finally {
          prepPromisesRef.current.delete(cacheKey);
        }
      })();

      prepPromisesRef.current.set(cacheKey, promise);
      return promise;
    },
    [aireToken],
  );

  const prepararAudioBiblioteca = useCallback(
    async (audioId: string, subtitulo: string): Promise<PreparedInterrupcion | null> => {
      const cacheKey = claveCacheInterrupcion("AUDIO", undefined, undefined, audioId);
      const cached = preparedRef.current.get(cacheKey);
      if (cached) return cached;

      const inflight = prepPromisesRef.current.get(cacheKey);
      if (inflight) return inflight;

      const promise = (async (): Promise<PreparedInterrupcion | null> => {
        try {
          const res = await fetch(
            `/api/aire/audio-biblioteca/${encodeURIComponent(audioId)}?token=${encodeURIComponent(aireToken)}`,
          );
          const contentType = res.headers.get("content-type") ?? "";
          if (!res.ok || !contentType.startsWith("audio/")) return null;
          const blob = await res.blob();
          const prepared: PreparedInterrupcion = { blob, subtitulo, audioId };
          preparedRef.current.set(cacheKey, prepared);
          return prepared;
        } catch {
          return null;
        } finally {
          prepPromisesRef.current.delete(cacheKey);
        }
      })();

      prepPromisesRef.current.set(cacheKey, promise);
      return promise;
    },
    [aireToken],
  );

  const prepararProximaProgramada = useCallback(
    (proxima: ProximaInterrupcionDj): void => {
      if (proxima.tipo === "AUDIO") {
        const items = audiosRef.current;
        if (items.length === 0) return;
        const idx = elegirSiguienteIndiceAudio(
          items,
          audioModoRef.current,
          audioIndexRef.current,
          ultimoAudioIdRef.current,
        );
        const item = items[idx];
        if (!item) return;
        void prepararAudioBiblioteca(item.id, item.nombre);
        return;
      }

      let publicidadId: string | undefined;
      let subtitulo: string | undefined;

      if (proxima.tipo === "PUBLICIDAD") {
        const item = resolverPublicidad(publicidadesRef.current, publicidadIndexRef.current);
        if (!item) return;
        publicidadId = item.publicidadId;
        subtitulo = item.subtitulo;
      }

      void prepararInterrupcionTts(proxima.tipo, publicidadId, subtitulo, proxima.horaObjetivoMs);
    },
    [prepararAudioBiblioteca, prepararInterrupcionTts],
  );

  const programarPreparacion = useCallback(
    (proxima: ProximaInterrupcionDj): void => {
      if (prepTimerRef.current !== null) {
        window.clearTimeout(prepTimerRef.current);
        prepTimerRef.current = null;
      }

      const intervaloHora =
        proxima.tipo === "HORA" ? (configRef.current?.djHoraIntervaloMin ?? null) : null;
      const delay = msHastaPrepararInterrupcion(proxima.tipo, proxima.enMs, intervaloHora);
      prepTimerRef.current = window.setTimeout(() => {
        prepTimerRef.current = null;
        prepararProximaProgramada(proxima);
      }, delay);
    },
    [prepararProximaProgramada],
  );

  const obtenerAudioPreparadoTts = useCallback(
    async (
      tipo: TipoInterrupcionDj,
      publicidadId?: string,
      subtitulo?: string,
      horaObjetivoMs?: number,
    ): Promise<PreparedInterrupcion | null> => {
      const cacheKey = claveCacheInterrupcion(tipo, publicidadId, horaObjetivoMs);
      const cached = preparedRef.current.get(cacheKey);
      if (cached) {
        preparedRef.current.delete(cacheKey);
        return cached;
      }
      return prepararInterrupcionTts(tipo, publicidadId, subtitulo, horaObjetivoMs);
    },
    [prepararInterrupcionTts],
  );

  const resolverPublicidadPreparada = useCallback(
    async (tipo: TipoInterrupcionDj, horaObjetivoMs?: number): Promise<PreparedInterrupcion | null> => {
      if (tipo !== "PUBLICIDAD") {
        return obtenerAudioPreparadoTts(tipo, undefined, undefined, horaObjetivoMs);
      }

      const total = publicidadesRef.current.length;
      if (total === 0) return null;

      const inicio = publicidadIndexRef.current;
      for (let i = 0; i < total; i += 1) {
        const idx = (inicio + i) % total;
        const item = resolverPublicidad(publicidadesRef.current, idx);
        if (!item) continue;

        const prepared = await obtenerAudioPreparadoTts(tipo, item.publicidadId, item.subtitulo);
        if (prepared) {
          publicidadIndexRef.current = siguienteIndicePublicidad(idx, total);
          return prepared;
        }
      }

      return null;
    },
    [obtenerAudioPreparadoTts],
  );

  const resolverAudioBibliotecaPreparada = useCallback(async (): Promise<PreparedInterrupcion | null> => {
    const items = audiosRef.current;
    if (items.length === 0) return null;

    const total = items.length;
    for (let intento = 0; intento < total; intento += 1) {
      const idx = elegirSiguienteIndiceAudio(
        items,
        audioModoRef.current,
        audioIndexRef.current,
        ultimoAudioIdRef.current,
      );
      const item = items[idx];
      if (!item) continue;

      const cacheKey = claveCacheInterrupcion("AUDIO", undefined, undefined, item.id);
      const cached = preparedRef.current.get(cacheKey);
      if (cached) {
        preparedRef.current.delete(cacheKey);
        audioIndexRef.current = idx;
        ultimoAudioIdRef.current = item.id;
        return cached;
      }

      const prepared = await prepararAudioBiblioteca(
        item.id,
        item.nombre || carpetaNombreRef.current,
      );
      if (prepared) {
        preparedRef.current.delete(cacheKey);
        audioIndexRef.current = idx;
        ultimoAudioIdRef.current = item.id;
        return prepared;
      }

      // Si falla este archivo, forzar avanzar el índice para el siguiente intento
      audioIndexRef.current = idx;
      ultimoAudioIdRef.current = item.id;
    }

    return null;
  }, [prepararAudioBiblioteca]);

  const reproducirBlob = useCallback(async (blob: Blob): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = (): void => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = (): void => {
        URL.revokeObjectURL(url);
        reject(new Error("audio error"));
      };
      void audio.play().catch(reject);
    });
  }, []);

  const ejecutarInterrupcion = useCallback(
    async (tipo: TipoInterrupcionDj, horaObjetivoMs?: number): Promise<void> => {
      const cfg = configRef.current;
      if (runningRef.current || !cfg) return;
      if (tipo !== "AUDIO" && !voiceIdRef.current) return;
      if (tipo === "PUBLICIDAD" && publicidadesRef.current.length === 0) return;
      if (tipo === "AUDIO" && audiosRef.current.length === 0) return;

      runningRef.current = true;
      let fadeOutHecho = false;

      try {
        const prepared =
          tipo === "AUDIO"
            ? await resolverAudioBibliotecaPreparada()
            : await resolverPublicidadPreparada(tipo, horaObjetivoMs);

        if (!prepared) {
          if (tipo === "HORA" && horaObjetivoMs != null) {
            ultimasRef.current.HORA = horaObjetivoMs;
          } else {
            ultimasRef.current[tipo] = Date.now();
          }
          return;
        }

        const subtitulo =
          tipo === "AUDIO"
            ? prepared.subtitulo ?? carpetaNombreRef.current
            : prepared.subtitulo;

        onOverlay(tipo, subtitulo);
        await onBeforePlay();
        fadeOutHecho = true;

        await reproducirBlob(prepared.blob);
        if (tipo === "HORA" && horaObjetivoMs != null) {
          ultimasRef.current.HORA = horaObjetivoMs;
        } else {
          ultimasRef.current[tipo] = Date.now();
        }
      } catch {
        if (tipo === "HORA" && horaObjetivoMs != null) {
          ultimasRef.current.HORA = horaObjetivoMs;
        } else {
          ultimasRef.current[tipo] = Date.now();
        }
      } finally {
        onOverlay(null);
        if (fadeOutHecho) {
          await onAfterPlay();
        }
        runningRef.current = false;
      }
    },
    [
      onAfterPlay,
      onBeforePlay,
      onOverlay,
      reproducirBlob,
      resolverAudioBibliotecaPreparada,
      resolverPublicidadPreparada,
    ],
  );

  const programar = useCallback((): void => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const cfg = configRef.current;
    if (!enabled || !cfg) return;

    const tieneAudio = cfg.djAudioActiva && Boolean(cfg.djAudioCarpetaId);
    const tieneTts = cfg.djHoraActiva || cfg.djClimaActivo || cfg.djPublicidadActiva;
    if (!tieneAudio && !tieneTts) return;
    if (tieneTts && !voiceIdRef.current && !tieneAudio) return;

    let proxima = calcularProximaInterrupcion(
      cfg,
      ultimasRef.current,
      Date.now(),
      slotInicioRef.current,
    );

    while (proxima && proxima.tipo !== "AUDIO" && !voiceIdRef.current) {
      if (proxima.tipo === "HORA" && proxima.horaObjetivoMs != null) {
        ultimasRef.current.HORA = proxima.horaObjetivoMs;
      } else {
        ultimasRef.current[proxima.tipo] = Date.now();
      }
      proxima = calcularProximaInterrupcion(
        cfg,
        ultimasRef.current,
        Date.now(),
        slotInicioRef.current,
      );
    }

    if (!proxima) return;

    programarPreparacion(proxima);

    const tipo = proxima.tipo;
    const horaObjetivoMs = proxima.horaObjetivoMs;

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (isBusy()) {
        timerRef.current = window.setTimeout(() => programarRef.current(), 5_000);
        return;
      }
      void ejecutarInterrupcion(tipo, horaObjetivoMs).finally(() => programarRef.current());
    }, proxima.enMs);
  }, [enabled, ejecutarInterrupcion, isBusy, programarPreparacion]);

  useEffect(() => {
    programarRef.current = programar;
  }, [programar]);

  const slotInicioSig = slotInicioMs != null ? String(slotInicioMs) : "";

  useEffect(() => {
    if (!enabled || !configSig) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      limpiarPreparacion();
      return undefined;
    }

    const cfg = configRef.current;
    if (!cfg) return undefined;

    if (configSig !== configSigRef.current || slotInicioSig !== slotInicioSigRef.current) {
      configSigRef.current = configSig;
      slotInicioSigRef.current = slotInicioSig;
      sincronizarUltimasDesdeConfig(ultimasRef.current, cfg, Date.now());
      limpiarPreparacion();
    }

    programar();
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (prepTimerRef.current !== null) {
        window.clearTimeout(prepTimerRef.current);
        prepTimerRef.current = null;
      }
    };
  }, [enabled, configSig, slotInicioSig, programar, limpiarPreparacion]);
}
