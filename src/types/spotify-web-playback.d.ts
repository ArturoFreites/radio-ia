export type SpotifyPlaybackState = {
  position: number;
  duration: number;
  paused: boolean;
  track_window: {
    current_track: SpotifySdkTrack | null;
    next_tracks: SpotifySdkTrack[];
    previous_tracks: SpotifySdkTrack[];
  };
};

export type SpotifySdkTrack = {
  id: string;
  name: string;
  uri: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  duration_ms: number;
};

export type SpotifyPlayer = {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: "ready", cb: (e: { device_id: string }) => void): void;
  addListener(event: "not_ready", cb: (e: { device_id: string }) => void): void;
  addListener(event: "player_state_changed", cb: (state: SpotifyPlaybackState | null) => void): void;
  addListener(event: "initialization_error", cb: (e: { message: string }) => void): void;
  addListener(event: "authentication_error", cb: (e: { message: string }) => void): void;
  addListener(event: "account_error", cb: (e: { message: string }) => void): void;
  addListener(event: "playback_error", cb: (e: { message: string }) => void): void;
  addListener(event: "autoplay_failed", cb: () => void): void;
  removeListener(event: string, cb?: unknown): void;
  getCurrentState(): Promise<SpotifyPlaybackState | null>;
  /** Volumen entre 0 y 1 (Web Playback SDK) */
  setVolume(volume: number): Promise<void>;
  getVolume(): Promise<number>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  activateElement(): Promise<void>;
};

type SpotifyPlayerConstructor = new (options: {
  name: string;
  getOAuthToken: (cb: (token: string) => void) => void;
  volume?: number;
}) => SpotifyPlayer;

declare global {
  interface Window {
    Spotify?: { Player: SpotifyPlayerConstructor };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

export {};
