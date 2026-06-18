import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function getAudioDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
  );
  return Math.round(Number.parseFloat(stdout.trim() || "0"));
}

export async function runFfmpeg(command: string): Promise<void> {
  await execAsync(command);
}
