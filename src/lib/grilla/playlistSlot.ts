import { normalizePlaylistId } from "@/lib/spotify/playlistId";

export function normalizarPlaylistSlot(
  playlistId: string | null | undefined,
  playlistNombre: string | null | undefined,
): { playlistId: string | null; playlistNombre: string | null } {
  const id = playlistId?.trim();
  if (!id) {
    return { playlistId: null, playlistNombre: null };
  }
  const spotifyId = normalizePlaylistId(id);
  const uri = `spotify:playlist:${spotifyId}`;
  const nombre = playlistNombre?.trim();
  return {
    playlistId: uri,
    playlistNombre: nombre && nombre.length > 0 ? nombre : null,
  };
}
