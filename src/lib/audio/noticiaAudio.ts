import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { ensamblarSecuencia } from "@/lib/audio/ensamblar";
import { parsearDialogo } from "@/lib/audio/dialogoParser";
import { getAudioDuration } from "@/lib/audio/ffmpeg";
import { getPreviewDirForBloque } from "@/lib/audio/previewPaths";
import { elevenLabsTTS } from "@/lib/elevenlabs/tts";

export async function generarAudioNoticia(params: {
  guion: string;
  voiceIdA: string;
  voiceIdB: string;
  bloqueId: string;
  baseDirOverride?: string;
  etiquetas?: { locutorA: string; locutorB: string };
  radioId?: string;
}): Promise<{ path: string; duracion: number }> {
  const baseDir = params.baseDirOverride ?? getPreviewDirForBloque(params.bloqueId);
  await mkdir(baseDir, { recursive: true });

  const turnos = parsearDialogo(params.guion, {
    locutorA: params.etiquetas?.locutorA ?? "LOCUTOR_A",
    locutorB: params.etiquetas?.locutorB ?? "LOCUTOR_B",
  });
  if (turnos.length === 0) {
    throw new Error("Guión de noticia sin turnos de diálogo");
  }

  const archivosTurno: string[] = [];
  try {
    for (let i = 0; i < turnos.length; i += 1) {
      const turno = turnos[i]!;
      const turnoPath = join(baseDir, `turno_${i}.mp3`);
      await elevenLabsTTS({
        text: turno.texto,
        voiceId: turno.locutor === "A" ? params.voiceIdA : params.voiceIdB,
        outputPath: turnoPath,
        radioId: params.radioId,
      });
      archivosTurno.push(turnoPath);
    }

    const outputFinal = join(baseDir, "noticia_preview.mp3");
    await ensamblarSecuencia({
      archivos: archivosTurno,
      outputPath: outputFinal,
      silencioMs: 300,
    });

    const duracion = await getAudioDuration(outputFinal);
    if (duracion > 75) {
      console.warn(`[noticiaAudio] Preview noticia supera 75s (${duracion}s) bloque=${params.bloqueId}`);
    }

    return { path: outputFinal, duracion };
  } finally {
    await Promise.all(archivosTurno.map((path) => unlink(path).catch(() => undefined)));
  }
}
