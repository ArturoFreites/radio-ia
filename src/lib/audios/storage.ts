import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAudioStorageRoot } from "@/lib/audio/previewPaths";

export const AUDIO_BIBLIOTECA_MAX_BYTES = 15 * 1024 * 1024;

const EXT_PERMITIDAS = new Set([".mp3", ".wav", ".m4a", ".ogg", ".mpeg", ".mp4"]);

const MIME_A_EXT: Record<string, string> = {
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/wave": ".wav",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/m4a": ".m4a",
  "audio/ogg": ".ogg",
};

export function extensionDesdeUpload(fileName: string, mimeType: string): string | null {
  const fromMime = MIME_A_EXT[mimeType.toLowerCase()];
  if (fromMime) return fromMime;
  const ext = path.extname(fileName).toLowerCase();
  if (EXT_PERMITIDAS.has(ext)) {
    if (ext === ".mpeg" || ext === ".mp4") return ext === ".mp4" ? ".m4a" : ".mp3";
    return ext;
  }
  return null;
}

export function relativePathBiblioteca(
  radioId: string,
  carpetaId: string,
  archivoId: string,
  ext: string,
): string {
  return path.join(radioId, "biblioteca", carpetaId, `${archivoId}${ext}`);
}

export function absolutePathBiblioteca(relativePath: string): string {
  return path.join(getAudioStorageRoot(), relativePath);
}

export async function guardarAudioBiblioteca(
  buffer: Buffer,
  radioId: string,
  carpetaId: string,
  archivoId: string,
  ext: string,
): Promise<{ relativePath: string; absolutePath: string }> {
  const relativePath = relativePathBiblioteca(radioId, carpetaId, archivoId, ext);
  const absolutePath = absolutePathBiblioteca(relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return { relativePath, absolutePath };
}

export async function eliminarArchivoBiblioteca(relativeOrAbsolute: string): Promise<void> {
  const absolute = path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : absolutePathBiblioteca(relativeOrAbsolute);
  await rm(absolute, { force: true });
}

export async function eliminarCarpetaBibliotecaDisco(
  radioId: string,
  carpetaId: string,
): Promise<void> {
  const dir = path.join(getAudioStorageRoot(), radioId, "biblioteca", carpetaId);
  await rm(dir, { recursive: true, force: true });
}
