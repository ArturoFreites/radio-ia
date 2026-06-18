import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const basePath = process.env.AUDIO_STORAGE_PATH ?? "./storage/audio";

export async function guardarAudio(buffer: Buffer, relativePath: string): Promise<string> {
  const absolutePath = join(basePath, relativePath);
  await mkdir(absolutePath.split("/").slice(0, -1).join("/"), { recursive: true });
  await writeFile(absolutePath, buffer);
  return absolutePath;
}

export function getAudioPath(relativePath: string): string {
  return join(basePath, relativePath);
}
