import { join, resolve } from "node:path";

export function getAudioStorageRoot(): string {
  return resolve(process.env.AUDIO_STORAGE_PATH ?? "/app/storage/audio");
}

export function getPreviewDirForBloque(bloqueId: string): string {
  const root = getAudioStorageRoot();
  const dir = resolve(join(root, "previews", bloqueId));
  if (!dir.startsWith(root)) {
    throw new Error("Ruta de preview fuera del almacenamiento");
  }
  return dir;
}
