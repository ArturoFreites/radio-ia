/** Extrae el ID de playlist de URI, URL de open.spotify.com o del ID crudo. */
export function normalizePlaylistId(input: string): string {
  const s = input.trim();
  const uri = s.match(/^spotify:playlist:([a-zA-Z0-9]+)/i);
  if (uri) return uri[1]!;
  const open = s.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?playlist\/([a-zA-Z0-9]+)/i);
  if (open) return open[1]!;
  const web = s.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/i);
  if (web) return web[1]!;
  return s;
}

/** Mercado ISO 3166-1 alpha-2 para filtros de disponibilidad en la Web API. */
export function spotifyPlaybackMarketFromPais(pais: string): string {
  const key = pais.trim();
  const map: Record<string, string> = {
    Argentina: "AR",
    España: "ES",
    Spain: "ES",
    Uruguay: "UY",
    Chile: "CL",
    México: "MX",
    Mexico: "MX",
    Colombia: "CO",
    Perú: "PE",
    Peru: "PE",
    Brasil: "BR",
    Brazil: "BR",
    Paraguay: "PY",
    Bolivia: "BO",
    Ecuador: "EC",
    Venezuela: "VE",
    "Estados Unidos": "US",
    "United States": "US",
  };
  return map[key] ?? process.env.SPOTIFY_DEFAULT_MARKET ?? "AR";
}
