import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { registrarConsumoElevenLabs } from "@/lib/consumo/registrar";

export interface ElevenLabsTTSParams {
  text: string;
  voiceId: string;
  outputPath: string;
  modelId?: string;
  radioId?: string;
}

const DEFAULT_MODEL = process.env.ELEVENLABS_PREVIEW_MODEL_ID ?? "eleven_multilingual_v2";
const OUTPUT_FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT ?? "mp3_44100_128";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function elevenLabsTTS(params: ElevenLabsTTSParams): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY no configurada");
  }

  let lastError: Error | null = null;
  for (let intento = 0; intento < 3; intento += 1) {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(params.voiceId)}?output_format=${encodeURIComponent(OUTPUT_FORMAT)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: params.text,
          model_id: params.modelId ?? DEFAULT_MODEL,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      },
    );

    if (response.status === 429 && intento < 2) {
      await sleep(2 ** intento * 1000);
      continue;
    }

    if (!response.ok) {
      const error = await response.text();
      lastError = new Error(`ElevenLabs TTS error ${response.status}: ${error}`);
      if (response.status >= 500 && intento < 2) {
        await sleep(2 ** intento * 500);
        continue;
      }
      throw lastError;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await mkdir(dirname(params.outputPath), { recursive: true });
    await writeFile(params.outputPath, buffer);
    if (params.radioId) {
      await registrarConsumoElevenLabs({
        radioId: params.radioId,
        caracteres: params.text.length,
        modelo: params.modelId ?? DEFAULT_MODEL,
      }).catch(() => undefined);
    }
    return;
  }

  throw lastError ?? new Error("ElevenLabs TTS fallo tras reintentos");
}
