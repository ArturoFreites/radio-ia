"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  calcularProximaInterrupcion,
  claveCacheInterrupcion,
  msHastaPrepararInterrupcion,
  siguienteIndicePublicidad,
  type UltimaEjecucionMap,
} from "@/lib/aire/djInterrupciones";
import { djConfigSignature, type DjInterrupcionesConfig } from "@/lib/grilla/djConfigSchema";
import type { TipoInterrupcionDj } from "@/types/grilla";

type PublicidadItem = { id: string; nombre: string; tieneAudio: boolean };

type PreparedInterrupcion = {
  blob: Blob;
  subtitulo?: string;
  publicidadId?: string;
};

type UseDjInterrupcionesParams = {
  aireToken: string;
  config: DjInterrupcionesConfig | null;
  voiceId: string | null;
  enabled: boolean;
  onBeforePlay: () => Promise<void>;
  onAfterPlay: () => Promise<void>;
  onOverlay: (tipo: TipoInterrupcionDj | null, subtitulo?: string) => void;
  isBusy: () => boolean;
};

function sincronizarUltimasDesdeConfig(ultimas: UltimaEjecucionMap, config: DjInterrupcionesConfig, now: number): void {
  if (config.djHoraActiva) ultimas.HORA = now;
  else delete ultimas.HORA;
  if (config.djClimaActivo) ultimas.CLIMA = now;
  else delete ultimas.CLIMA;
  if (config.djPublicidadActiva) ultimas.PUBLICIDAD = now;
  else delete ultimas.PUBLICIDAD;
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
  const runningRef = useRef(false);
  const preparedRef = useRef<Map<string, PreparedInterrupcion>>(new Map());
  const prepPromisesRef = useRef<Map<string, Promise<PreparedInterrupcion | null>>>(new Map());
  const configRef = useRef(config);
  configRef.current = config;
  const configSigRef = useRef("");
  const voiceIdRef = useRef(voiceId);
  voiceIdRef.current = voiceId;

  const configSig = config ? djConfigSignature(config) : "";

  useEffect(() => {
    if (!enabled || !config) return undefined;
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

  const limpiarPreparacion = useCallback((): void => {
    if (prepTimerRef.current !== null) {
      window.clearTimeout(prepTimerRef.current);
      prepTimerRef.current = null;
    }
    preparedRef.current.clear();
    prepPromisesRef.current.clear();
  }, []);

  const prepararInterrupcion = useCallback(
    async (tipo: TipoInterrupcionDj, publicidadId?: string, subtitulo?: string): Promise<PreparedInterrupcion | null> => {
      const voz = voiceIdRef.current;
      if (!voz) return null;
      if (tipo === "PUBLICIDAD" && !publicidadId) return null;

      const cacheKey = claveCacheInterrupcion(tipo, publicidadId);
      const cached = preparedRef.current.get(cacheKey);
      if (cached) return cached;

      const inflight = prepPromisesRef.current.get(cacheKey);
      if (inflight) return inflight;

      const promise = (async (): Promise<PreparedInterrupcion | null> => {
        try {
          const res = await fetch("/api/aire/dj-interrupcion/preparar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aireToken, tipo, voiceId: voz, publicidadId }),
          });
          if (!res.ok) return null;
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

  const prepararProximaProgramada = useCallback(
    (proxima: { tipo: TipoInterrupcionDj; enMs: number }): void => {
      let publicidadId: string | undefined;
      let subtitulo: string | undefined;

      if (proxima.tipo === "PUBLICIDAD") {
        const item = resolverPublicidad(publicidadesRef.current, publicidadIndexRef.current);
        if (!item) return;
        publicidadId = item.publicidadId;
        subtitulo = item.subtitulo;
      }

      void prepararInterrupcion(proxima.tipo, publicidadId, subtitulo);
    },
    [prepararInterrupcion],
  );

  const programarPreparacion = useCallback(
    (proxima: { tipo: TipoInterrupcionDj; enMs: number }): void => {
      if (prepTimerRef.current !== null) {
        window.clearTimeout(prepTimerRef.current);
        prepTimerRef.current = null;
      }

      const delay = msHastaPrepararInterrupcion(proxima.tipo, proxima.enMs);
      prepTimerRef.current = window.setTimeout(() => {
        prepTimerRef.current = null;
        prepararProximaProgramada(proxima);
      }, delay);
    },
    [prepararProximaProgramada],
  );

  const obtenerAudioPreparado = useCallback(
    async (
      tipo: TipoInterrupcionDj,
      publicidadId?: string,
      subtitulo?: string,
    ): Promise<PreparedInterrupcion | null> => {
      const cacheKey = claveCacheInterrupcion(tipo, publicidadId);
      const cached = preparedRef.current.get(cacheKey);
      if (cached) {
        preparedRef.current.delete(cacheKey);
        return cached;
      }
      return prepararInterrupcion(tipo, publicidadId, subtitulo);
    },
    [prepararInterrupcion],
  );

  const ejecutarInterrupcion = useCallback(
    async (tipo: TipoInterrupcionDj): Promise<void> => {
      const cfg = configRef.current;
      if (runningRef.current || !cfg || !voiceIdRef.current) return;
      if (tipo === "PUBLICIDAD" && publicidadesRef.current.length === 0) return;

      runningRef.current = true;
      let subtitulo: string | undefined;
      let publicidadId: string | undefined;

      if (tipo === "PUBLICIDAD") {
        const item = resolverPublicidad(publicidadesRef.current, publicidadIndexRef.current);
        if (!item) {
          runningRef.current = false;
          return;
        }
        publicidadId = item.publicidadId;
        subtitulo = item.subtitulo;
        publicidadIndexRef.current = siguienteIndicePublicidad(
          publicidadIndexRef.current,
          publicidadesRef.current.length,
        );
      }

      try {
        onOverlay(tipo, subtitulo);
        await onBeforePlay();

        const prepared = await obtenerAudioPreparado(tipo, publicidadId, subtitulo);
        if (!prepared) return;

        await new Promise<void>((resolve, reject) => {
          const url = URL.createObjectURL(prepared.blob);
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

        ultimasRef.current[tipo] = Date.now();
      } catch {
        /* skip failed interruption */
      } finally {
        onOverlay(null);
        await onAfterPlay();
        runningRef.current = false;
      }
    },
    [obtenerAudioPreparado, onBeforePlay, onAfterPlay, onOverlay],
  );

  const programar = useCallback((): void => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const cfg = configRef.current;
    if (!enabled || !cfg || !voiceIdRef.current) return;

    const proxima = calcularProximaInterrupcion(cfg, ultimasRef.current, Date.now());
    if (!proxima) return;

    programarPreparacion(proxima);

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (isBusy()) {
        timerRef.current = window.setTimeout(() => programar(), 5_000);
        return;
      }
      void ejecutarInterrupcion(proxima.tipo).finally(() => programar());
    }, proxima.enMs);
  }, [enabled, ejecutarInterrupcion, isBusy, programarPreparacion]);

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

    if (configSig !== configSigRef.current) {
      configSigRef.current = configSig;
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
  }, [enabled, configSig, programar, limpiarPreparacion]);
}
