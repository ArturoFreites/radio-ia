"use client";

import { useEffect, useState } from "react";
import { AireScopedOverlay } from "@/components/aire/AireScopedOverlay";
import type { SpotifySdkTrack } from "@/types/spotify-web-playback";

type PresentacionOverlayProps = {
  visible: boolean;
  track: SpotifySdkTrack | null;
  audioProgress: number;
  titulo?: string;
  scoped?: boolean;
};

const WAVE_BAR_DELAYS_MS = [0, 120, 240, 360, 480] as const;

export function PresentacionOverlay({
  visible,
  track,
  audioProgress,
  titulo,
  scoped = false,
}: PresentacionOverlayProps): React.ReactElement {
  const cover = track?.album.images[0]?.url;
  const artistas = track?.artists?.map((a) => a.name).join(" — ") ?? "";
  const [coverFallida, setCoverFallida] = useState(false);
  const modoIntro = Boolean(titulo);

  useEffect(() => {
    setCoverFallida(false);
  }, [cover]);

  const mostrarPortada = !modoIntro && Boolean(cover) && !coverFallida;
  const vozEnCurso = audioProgress > 0 && audioProgress < 1;
  const tituloVisible = titulo ?? track?.name ?? "—";

  return (
    <>
      <style>{`
        @keyframes airePresentacionWave {
          0%, 100% { height: 4px; }
          50% { height: 28px; }
        }
        .aire-presentacion-wave-bar {
          width: 4px;
          border-radius: 2px;
          background-color: var(--primary);
          animation: airePresentacionWave 0.8s ease-in-out infinite;
        }
      `}</style>
      <AireScopedOverlay visible={visible} scoped={scoped}>
        <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--primary)]">
          {modoIntro ? "En vivo" : "A continuación"}
        </p>
        {mostrarPortada ? (
          <div
            className="mx-auto mb-4 aspect-square w-full max-w-[160px] overflow-hidden shadow-[var(--shadow-hover)]"
            style={{ borderRadius: "var(--r-lg)" }}
          >
            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setCoverFallida(true)}
            />
          </div>
        ) : modoIntro ? null : (
          <div
            className="mx-auto mb-4 flex aspect-square w-full max-w-[160px] items-center justify-center bg-white/[0.06] text-4xl"
            style={{ borderRadius: "var(--r-lg)" }}
          >
            ♪
          </div>
        )}
        <h3 className="text-center text-lg font-semibold tracking-tight text-white">{tituloVisible}</h3>
        {!modoIntro ? (
          <p className="mt-1 text-center text-sm text-[color:var(--muted)]">
            {artistas}
            {track?.album.name ? ` · ${track.album.name}` : ""}
          </p>
        ) : null}
        {vozEnCurso ? (
          <div className="mt-5 flex items-end justify-center gap-1.5" style={{ height: 28 }} aria-hidden>
            {WAVE_BAR_DELAYS_MS.map((delayMs) => (
              <div
                key={delayMs}
                className="aire-presentacion-wave-bar"
                style={{ animationDelay: `${delayMs}ms` }}
              />
            ))}
          </div>
        ) : null}
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-[color:var(--primary)] transition-[width] duration-150 ease-linear"
            style={{ width: `${Math.round(audioProgress * 100)}%` }}
          />
        </div>
      </AireScopedOverlay>
    </>
  );
}
