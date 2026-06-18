import { spotifyFetchJson } from "@/lib/spotify/client";

export { spotifyFetchJson } from "@/lib/spotify/client";

type SpotifyPlaylistItem = {
  id: string;
  name: string;
  images: { url: string }[] | null;
  items?: { href?: string; total: number };
  tracks?: { href?: string; total: number };
  collaborative?: boolean;
  owner?: { id: string };
};

function playlistTracksTotal(p: SpotifyPlaylistItem): number {
  const it = p.items;
  const fromItems =
    it && typeof it === "object" && !Array.isArray(it) && typeof it.total === "number" ? it.total : undefined;
  const tr = p.tracks;
  const fromTracks = tr && typeof tr.total === "number" ? tr.total : undefined;
  return fromItems ?? fromTracks ?? 0;
}

type SpotifyTrackItem = {
  id: string;
  name: string;
  duration_ms: number;
  artists?: { id: string; name: string }[];
  album?: { name: string; images: { url: string }[]; release_date?: string };
};

export async function fetchSpotifyUserProfile(accessToken: string): Promise<{ id: string }> {
  return spotifyFetchJson<{ id: string }>(accessToken, "/me");
}

export type SpotifyPlaylistRow = {
  id: string;
  name: string;
  imageUrl: string | null;
  tracksTotal: number;
  /** GET /playlists/{id}/tracks devuelve 403 si no sos dueño o colaborador (seguir no alcanza). */
  canReadTracksViaApi: boolean;
};

type MePlaylistsPage = { items?: SpotifyPlaylistItem[]; next?: string | null };

export async function fetchUserPlaylists(
  accessToken: string,
  spotifyUserId: string,
): Promise<SpotifyPlaylistRow[]> {
  const acumulado: SpotifyPlaylistItem[] = [];
  let url: string | null = "/me/playlists?limit=50";
  while (url) {
    const page: MePlaylistsPage = await spotifyFetchJson<MePlaylistsPage>(accessToken, url);
    acumulado.push(...(page.items ?? []));
    url = page.next ?? null;
  }
  return acumulado.map((p) => {
    const ownerId = p.owner?.id ?? "";
    const canReadTracksViaApi =
      ownerId === "" || ownerId === spotifyUserId || Boolean(p.collaborative);
    return {
      id: p.id,
      name: p.name,
      imageUrl: (p.images ?? [])[0]?.url ?? null,
      tracksTotal: playlistTracksTotal(p),
      canReadTracksViaApi,
    };
  });
}

type PlaylistItemRow = {
  item?: SpotifyTrackItem | { type: string; id?: string } | null;
};

function rowToMusicTrack(row: PlaylistItemRow): SpotifyTrackItem | null {
  const raw = row.item;
  if (typeof raw !== "object" || raw === null || !("id" in raw)) return null;
  const cand = raw as SpotifyTrackItem & { type?: string };
  if (!cand.id) return null;
  if (cand.type === "episode" || cand.type === "show") return null;
  if (cand.type != null && cand.type !== "track") return null;
  return cand as SpotifyTrackItem;
}

function playlistItemsPath(playlistSpotifyId: string, market: string): string {
  const q = new URLSearchParams({ limit: "50", market, additional_types: "track" });
  return `/playlists/${encodeURIComponent(playlistSpotifyId)}/items?${q.toString()}`;
}

export async function fetchPlaylistTracksFirstPage(
  accessToken: string,
  playlistSpotifyId: string,
  options?: { market?: string },
): Promise<SpotifyTrackItem[]> {
  type Page = { items?: PlaylistItemRow[] };
  const market = options?.market ?? process.env.SPOTIFY_DEFAULT_MARKET ?? "AR";
  const data = await spotifyFetchJson<Page>(accessToken, playlistItemsPath(playlistSpotifyId, market));
  const rows = Array.isArray(data.items) ? data.items : [];
  return rows.map((row) => rowToMusicTrack(row)).filter((t): t is SpotifyTrackItem => Boolean(t?.id));
}

export async function fetchTrack(accessToken: string, trackId: string): Promise<SpotifyTrackItem> {
  return spotifyFetchJson<SpotifyTrackItem>(accessToken, `/tracks/${encodeURIComponent(trackId)}`);
}

export async function fetchArtist(
  accessToken: string,
  artistId: string,
): Promise<{ genres: string[]; followers?: { total: number }; popularity?: number }> {
  return spotifyFetchJson(accessToken, `/artists/${encodeURIComponent(artistId)}`);
}

export { normalizePlaylistId } from "@/lib/spotify/playlistId";
