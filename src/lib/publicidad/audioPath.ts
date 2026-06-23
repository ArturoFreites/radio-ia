import { access } from "node:fs/promises";
import path from "node:path";
import { getAudioStorageRoot } from "@/lib/audio/previewPaths";

export type AudioAlmacenadoContentType = "audio/mpeg" | "audio/wav" | "audio/ogg";

export function contentTypeDesdeRutaAudio(filePath: string): AudioAlmacenadoContentType {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".wav") return "audio/wav";
  if (ext === ".ogg") return "audio/ogg";
  return "audio/mpeg";
}

const candidatosRutaAudio = (audioUrl: string): string[] => {
  const trimmed = audioUrl.trim();
  if (!trimmed) return [];

  if (path.isAbsolute(trimmed)) {
    return [trimmed];
  }

  const sinSlash = trimmed.replace(/^\//, "");
  const root = getAudioStorageRoot();
  return [
    path.join(process.cwd(), sinSlash),
    path.join(root, sinSlash),
    path.join(process.cwd(), trimmed),
  ];
};

export async function resolverRutaAudioAlmacenado(audioUrl: string): Promise<string | null> {
  const candidatos = candidatosRutaAudio(audioUrl);
  for (const candidato of candidatos) {
    try {
      await access(candidato);
      return candidato;
    } catch {
      /* siguiente candidato */
    }
  }
  return null;
}
