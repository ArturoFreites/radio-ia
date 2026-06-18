import type { SpotifyPlayer } from "@/types/spotify-web-playback";

export async function fadeSpotifyPlayerVolume(
  player: SpotifyPlayer,
  from: number,
  to: number,
  totalMs: number,
): Promise<void> {
  const steps = Math.max(1, Math.floor(totalMs / 100));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const v = from + (to - from) * t;
    await player.setVolume(Math.max(0, Math.min(1, v)));
    await new Promise<void>((r) => setTimeout(r, 100));
  }
}

export async function fadeHtmlAudioVolume(
  audio: HTMLAudioElement,
  from: number,
  to: number,
  totalMs: number,
): Promise<void> {
  const steps = Math.max(1, Math.floor(totalMs / 100));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const v = from + (to - from) * t;
    audio.volume = Math.max(0, Math.min(1, v));
    await new Promise<void>((r) => setTimeout(r, 100));
  }
}
