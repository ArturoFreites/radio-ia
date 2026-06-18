import { writeFile, unlink } from "node:fs/promises";
import { getAudioDuration, runFfmpeg } from "@/lib/audio/ffmpeg";

export async function ensamblarSecuencia(params: {
  archivos: string[];
  outputPath: string;
  silencioMs?: number;
  silenciosPorTurno?: number[];
}): Promise<void> {
  const archivos = params.archivos;
  if (archivos.length === 0) {
    throw new Error("ensamblarSecuencia: sin archivos");
  }

  const silenciosExplicitos = params.silenciosPorTurno !== undefined;
  if (silenciosExplicitos && params.silenciosPorTurno!.length !== archivos.length - 1) {
    throw new Error(
      `ensamblarSecuencia: silenciosPorTurno debe tener longitud ${archivos.length - 1}, recibido ${params.silenciosPorTurno!.length}`,
    );
  }

  const silencioDefault = params.silencioMs ?? 300;
  const normalizedPaths: string[] = [];
  for (const archivo of archivos) {
    const normalizedPath = `${archivo}.normalized.wav`;
    await runFfmpeg(
      `ffmpeg -y -i "${archivo}" -ar 44100 -ac 1 -acodec pcm_s16le "${normalizedPath}"`,
    );
    normalizedPaths.push(normalizedPath);
  }

  const listPath = `${params.outputPath}.list.txt`;
  const silencePathsToUnlink: string[] = [];

  if (!silenciosExplicitos) {
    const silencioPath = `${params.outputPath}.silence.wav`;
    await runFfmpeg(
      `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${silencioDefault / 1000} -acodec pcm_s16le "${silencioPath}"`,
    );
    silencePathsToUnlink.push(silencioPath);

    const content = normalizedPaths
      .flatMap((path, index) =>
        index < normalizedPaths.length - 1 ? [`file '${path}'`, `file '${silencioPath}'`] : [`file '${path}'`],
      )
      .join("\n");
    await writeFile(listPath, content, "utf8");
  } else {
    const silencios = params.silenciosPorTurno!;
    const silencePaths: string[] = [];
    for (let i = 0; i < normalizedPaths.length - 1; i += 1) {
      const ms = silencios[i]!;
      const silencePath = `${params.outputPath}.silence.${i}.wav`;
      await runFfmpeg(
        `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${ms / 1000} -acodec pcm_s16le "${silencePath}"`,
      );
      silencePaths.push(silencePath);
      silencePathsToUnlink.push(silencePath);
    }

    const lineas: string[] = [];
    for (let i = 0; i < normalizedPaths.length; i += 1) {
      lineas.push(`file '${normalizedPaths[i]}'`);
      if (i < normalizedPaths.length - 1) {
        lineas.push(`file '${silencePaths[i]}'`);
      }
    }
    await writeFile(listPath, lineas.join("\n"), "utf8");
  }

  await runFfmpeg(
    `ffmpeg -y -f concat -safe 0 -i "${listPath}" -acodec libmp3lame -ab 128k "${params.outputPath}"`,
  );

  await Promise.all([
    unlink(listPath).catch(() => undefined),
    ...silencePathsToUnlink.map((path) => unlink(path).catch(() => undefined)),
    ...normalizedPaths.map((path) => unlink(path).catch(() => undefined)),
  ]);
}

export async function ensamblarPrograma(params: {
  bloques: { audioPath: string; orden: number }[];
  outputPath: string;
  silencioEntreBloquesMs?: number;
}): Promise<{ duracionTotal: number; path: string }> {
  const silencio = params.silencioEntreBloquesMs ?? 500;
  const bloquesOrdenados = [...params.bloques].sort((a, b) => a.orden - b.orden);
  const normalizedPaths: string[] = [];

  for (const bloque of bloquesOrdenados) {
    const normalizedPath = `${bloque.audioPath}.normalized.wav`;
    await runFfmpeg(
      `ffmpeg -y -i "${bloque.audioPath}" -ar 44100 -ac 1 -acodec pcm_s16le "${normalizedPath}"`,
    );
    normalizedPaths.push(normalizedPath);
  }

  const silencioPath = `${params.outputPath}.silence.wav`;
  await runFfmpeg(
    `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${silencio / 1000} -acodec pcm_s16le "${silencioPath}"`,
  );

  const content = normalizedPaths
    .flatMap((path, index) => (index < normalizedPaths.length - 1 ? [`file '${path}'`, `file '${silencioPath}'`] : [`file '${path}'`]))
    .join("\n");
  const listPath = `${params.outputPath}.list.txt`;
  await writeFile(listPath, content, "utf8");

  await runFfmpeg(
    `ffmpeg -y -f concat -safe 0 -i "${listPath}" -acodec libmp3lame -ab 128k "${params.outputPath}"`,
  );

  const duracionTotal = await getAudioDuration(params.outputPath);
  await Promise.all([
    unlink(listPath).catch(() => undefined),
    unlink(silencioPath).catch(() => undefined),
    ...normalizedPaths.map((path) => unlink(path).catch(() => undefined)),
  ]);

  return { duracionTotal, path: params.outputPath };
}
