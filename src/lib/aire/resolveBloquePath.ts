import { access } from "node:fs/promises";
import { join } from "node:path";
import { getAudioStorageRoot, getPreviewDirForBloque } from "@/lib/audio/previewPaths";

export async function resolveBloqueAudioPath(
  audioUrl: string,
  bloqueId: string,
  radioId: string,
  programaId: string,
): Promise<string | null> {
  if (audioUrl.startsWith("/api/audio/preview/")) {
    const dir = getPreviewDirForBloque(bloqueId);
    const candidates = [
      join(dir, "noticia_preview.mp3"),
      join(dir, "preview.mp3"),
      join(dir, `${bloqueId}.mp3`),
    ];
    for (const p of candidates) {
      try {
        await access(p);
        return p;
      } catch {
        /* siguiente */
      }
    }
    return null;
  }

  const root = getAudioStorageRoot();
  const absoluto = audioUrl.startsWith("/") ? audioUrl : join(root, radioId, programaId, audioUrl);
  try {
    await access(absoluto);
    return absoluto;
  } catch {
    return null;
  }
}
