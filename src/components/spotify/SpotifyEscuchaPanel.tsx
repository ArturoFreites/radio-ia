"use client";

import { useCallback, useEffect, useState } from "react";
import { SpotifyIcon } from "@/components/brand/SpotifyIcon";
import { SpotifyPanel } from "@/components/spotify/SpotifyPanel";

type ReproductorState = {
  isPlaying: boolean;
  progressMs: number;
  current: {
    name: string;
    artist: string;
    imageUrl: string | null;
    durationMs: number;
  } | null;
  next: {
    name: string;
    artist: string;
    imageUrl: string | null;
  } | null;
};

type SpotifyEscuchaPanelProps = {
  sesionId: string;
  panelToken: string;
  playlistId: string;
  playlistNombre: string;
  radioNombre: string;
};

export function SpotifyEscuchaPanel({
  sesionId,
  panelToken,
  playlistId,
  playlistNombre,
  radioNombre,
}: SpotifyEscuchaPanelProps): React.ReactElement {
  const [state, setState] = useState<ReproductorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(async (): Promise<void> => {
    const q = new URLSearchParams({ token: panelToken });
    const res = await fetch(`/api/spotify/sesion/${encodeURIComponent(sesionId)}/reproductor?${q}`);
    if (!res.ok) {
      setError("Conectá la app de Spotify al dispositivo «Airon» para controlar la música.");
      setState(null);
      setLoading(false);
      return;
    }
    setError(null);
    const data = (await res.json()) as ReproductorState;
    setState(data);
    setLoading(false);
  }, [sesionId, panelToken]);

  useEffect(() => {
    void fetchState();
    const id = window.setInterval(() => void fetchState(), 5_000);
    return () => window.clearInterval(id);
  }, [fetchState]);

  const control = useCallback(
    async (action: "play" | "pause" | "next" | "previous"): Promise<void> => {
      await fetch(`/api/spotify/sesion/${encodeURIComponent(sesionId)}/reproductor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: panelToken, action }),
      });
      void fetchState();
    },
    [sesionId, panelToken, fetchState],
  );

  const current = state?.current;
  const progress =
    current && current.durationMs > 0 ? Math.min(1, (state?.progressMs ?? 0) / current.durationMs) : 0;

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-8 text-center text-white">
        <p className="text-sm text-zinc-500">Consultando reproducción…</p>
      </div>
    );
  }

  if (!error && current === null) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <SpotifyPanel
          sesionId={sesionId}
          panelToken={panelToken}
          playlistId={playlistId}
          playlistNombre={playlistNombre}
          radioNombre={radioNombre}
          modo="aire"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-8 text-center text-white">
      <p className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500">
        <SpotifyIcon size="xs" />
        Modo DJ · {radioNombre}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{playlistNombre}</p>

      {error ? <p className="mt-6 text-sm text-amber-400">{error}</p> : null}

      {current ? (
        <>
          {current.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.imageUrl}
              alt=""
              className="mt-8 h-40 w-40 rounded-lg object-cover shadow-lg"
            />
          ) : (
            <div className="mt-8 h-40 w-40 rounded-lg bg-zinc-800" />
          )}
          <h2 className="mt-6 max-w-lg text-2xl font-semibold">{current.name}</h2>
          <p className="mt-1 text-zinc-400">{current.artist}</p>
          <div
            className="mt-6 h-1 w-full max-w-md overflow-hidden rounded-full bg-zinc-800"
            aria-hidden
          >
            <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </>
      ) : null}

      {state?.next ? (
        <p className="mt-6 text-sm text-zinc-500">
          Siguiente: {state.next.name} — {state.next.artist}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => void control("previous")}
          className="min-h-11 rounded-lg border border-zinc-700 px-4 text-sm text-zinc-200 hover:bg-zinc-900"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => void control(state?.isPlaying ? "pause" : "play")}
          className="min-h-11 rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-6 text-sm font-medium text-emerald-100"
        >
          {state?.isPlaying ? "Pausar" : "Reproducir"}
        </button>
        <button
          type="button"
          onClick={() => void control("next")}
          className="min-h-11 rounded-lg border border-zinc-700 px-4 text-sm text-zinc-200 hover:bg-zinc-900"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
