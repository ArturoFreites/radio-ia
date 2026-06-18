const SPOTIFY_API = "https://api.spotify.com/v1";

function resolveUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SPOTIFY_API}${path}`;
}

/** GET JSON a la Web API de Spotify. `pathOrUrl` puede ser ruta (`/me`) o URL absoluta (paginación `next`). */
export async function spotifyFetchJson<T>(accessToken: string, pathOrUrl: string): Promise<T> {
  const url = resolveUrl(pathOrUrl);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify HTTP ${res.status}: ${body.slice(0, 500)}`);
  }
  return res.json() as Promise<T>;
}
