"use client";

import { useEffect, useRef, useState } from "react";

type BloqueAudio = {
  id: string;
  titulo: string;
  audioUrl: string | null;
  duracion: number | null;
};

export function PanelOBS({ programaId, token, bloques }: { programaId: string; token: string; bloques: BloqueAudio[] }): React.ReactElement {
  const playersRef = useRef<Array<HTMLAudioElement | null>>([]);
  useEffect(() => {
    playersRef.current = bloques.map((bloque) => {
      if (!bloque.audioUrl) return null;
      if (bloque.audioUrl.startsWith("/api/audio/preview/")) {
        const url = `${bloque.audioUrl}?programaId=${encodeURIComponent(programaId)}&token=${encodeURIComponent(token)}`;
        return new Audio(url);
      }
      return new Audio(`/api/audio/stream/${programaId}?path=${encodeURIComponent(bloque.audioUrl)}&token=${token}`);
    });
  }, [bloques, programaId, token]);

  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [playing, setPlaying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const autoModeRef = useRef(false);

  const hasAudioAtIndex = (index: number): boolean => Boolean(playersRef.current[index]);

  const findNextPlayableIndex = (fromIndex: number): number => {
    for (let idx = fromIndex + 1; idx < bloques.length; idx += 1) {
      if (hasAudioAtIndex(idx)) return idx;
    }
    return -1;
  };

  const findFirstPlayableIndex = (): number => {
    for (let idx = 0; idx < bloques.length; idx += 1) {
      if (hasAudioAtIndex(idx)) return idx;
    }
    return -1;
  };

  const stopAll = (): void => {
    for (const audio of playersRef.current) {
      audio?.pause();
    }
    setCurrentIndex(-1);
    setPlaying(false);
    autoModeRef.current = false;
  };

  const playIndex = (index: number, auto = false): void => {
    const audio = playersRef.current[index];
    if (!audio) {
      setStatusMessage("Preview pendiente: este bloque todavía no tiene audio generado.");
      if (auto) {
        const nextPlayable = findNextPlayableIndex(index);
        if (nextPlayable >= 0) {
          playIndex(nextPlayable, true);
        } else {
          setPlaying(false);
          autoModeRef.current = false;
        }
      }
      return;
    }
    stopAll();
    autoModeRef.current = auto;
    setCurrentIndex(index);
    setPlaying(true);
    setStatusMessage(null);
    audio.onended = () => {
      if (autoModeRef.current) {
        const nextPlayable = findNextPlayableIndex(index);
        if (nextPlayable >= 0) {
          playIndex(nextPlayable, true);
        } else {
          setPlaying(false);
          autoModeRef.current = false;
        }
      } else {
        setPlaying(false);
      }
    };
    void audio.play().catch(() => {
      setPlaying(false);
      autoModeRef.current = false;
      setStatusMessage("No se pudo reproducir el audio. Verificá que el archivo exista.");
    });
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-semibold mb-6">Panel OBS</h1>
      <div className="space-y-2">
        {bloques.map((item, idx) => (
          <button
            key={item.id}
            className={`w-full rounded border px-3 py-3 text-left ${currentIndex === idx ? "border-red-500 bg-zinc-900" : "border-zinc-800 bg-zinc-950"} ${!item.audioUrl ? "opacity-60" : ""}`}
            onClick={() => playIndex(idx)}
          >
            {item.titulo} · {item.duracion ?? 0}s {!item.audioUrl ? "· sin audio" : ""}
          </button>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        <button
          className="rounded bg-indigo-600 px-3 py-2"
          onClick={() => {
            const firstPlayable = findFirstPlayableIndex();
            if (firstPlayable >= 0) {
              playIndex(firstPlayable, true);
              return;
            }
            setStatusMessage("Este programa todavía no tiene audios generados.");
          }}
        >
          Play todo
        </button>
        <button
          className="rounded border border-zinc-600 px-3 py-2"
          onClick={() => {
            const nextPlayable = findNextPlayableIndex(currentIndex);
            if (nextPlayable >= 0) {
              playIndex(nextPlayable);
              return;
            }
            setStatusMessage("No hay más bloques con audio disponible.");
          }}
        >
          Siguiente
        </button>
        <button className="rounded border border-zinc-600 px-3 py-2" onClick={stopAll}>
          Stop
        </button>
      </div>
      <p className="mt-3 text-sm text-zinc-400">{playing ? "Reproduciendo" : "Detenido"}</p>
      {statusMessage ? <p className="mt-1 text-sm text-amber-300">{statusMessage}</p> : null}
    </div>
  );
}
