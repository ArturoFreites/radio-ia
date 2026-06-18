import { spotifyFetchJson } from "@/lib/spotify/client";

export type SpotifyPlayerItem = {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string; images: Array<{ url: string }> };
  duration_ms: number;
};

/** @deprecated Usar SpotifyPlayerItem */
export type SpotifyPlayerTrack = SpotifyPlayerItem;

export type SpotifyPlayerState = {
  is_playing: boolean;
  progress_ms: number;
  item: SpotifyPlayerItem | null;
};

export async function fetchPlayerState(accessToken: string): Promise<SpotifyPlayerState | null> {
  const res = await fetch("https://api.spotify.com/v1/me/player", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 204) return null;
  if (!res.ok) return null;
  return (await res.json()) as SpotifyPlayerState;
}

export async function playerControl(
  accessToken: string,
  action: "play" | "pause" | "next" | "previous",
): Promise<void> {
  const method = action === "play" || action === "pause" ? "PUT" : "POST";
  const path =
    action === "play" ? "/me/player/play" : action === "pause" ? "/me/player/pause" : `/me/player/${action}`;
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Spotify player ${action}: ${res.status}`);
  }
}

type SpotifyQueueRaw = {
  currently_playing: SpotifyPlayerItem | null;
  queue: SpotifyPlayerItem[];
};

export type SpotifyQueueResponse = {
  currently_playing: SpotifyPlayerItem | null;
  queue: SpotifyPlayerItem[];
};

export async function fetchPlayerQueue(accessToken: string): Promise<SpotifyQueueResponse | null> {
  try {
    const raw = await spotifyFetchJson<SpotifyQueueRaw>(accessToken, "/me/player/queue");
    return {
      currently_playing: raw.currently_playing,
      queue: raw.queue.filter((t): t is SpotifyPlayerItem => Boolean(t?.id)),
    };
  } catch {
    return null;
  }
}
