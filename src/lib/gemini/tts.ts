import { writeFile } from "node:fs/promises";
import { getAudioDuration } from "@/lib/audio/ffmpeg";
import { registrarConsumoElevenLabs } from "@/lib/consumo/registrar";

const ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID ?? "eleven_turbo_v2_5";
const ELEVENLABS_OUTPUT_FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT ?? "mp3_44100_128";
const ELEVENLABS_DEFAULT_VOICE_ID = process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? "QK4xDwo9ESPHA4JNUpX3";
const ELEVENLABS_FREE_FALLBACK_VOICE_ID =
  process.env.ELEVENLABS_FREE_FALLBACK_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb";

class ElevenLabsApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ElevenLabsApiError";
    this.status = status;
    this.code = code;
  }
}

function parseSampleRateFromOutputFormat(outputFormat: string): number {
  const match = outputFormat.match(/_(\d{4,6})$/);
  if (!match) return 44_100;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 44_100;
}

function buildWavFromPcm16Mono(pcmBuffer: Buffer, sampleRate: number): Buffer {
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size para PCM
  header.writeUInt16LE(1, 20); // AudioFormat PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function decodePcmToWav(audioBuffer: Buffer, contentType: string | null): Buffer {
  const normalizedContentType = (contentType ?? "").toLowerCase();
  if (normalizedContentType.includes("audio/l16") || normalizedContentType.includes("audio/pcm")) {
    return buildWavFromPcm16Mono(audioBuffer, parseSampleRateFromOutputFormat(ELEVENLABS_OUTPUT_FORMAT));
  }
  return audioBuffer;
}

async function generateWithElevenLabs(params: {
  texto: string;
  vozId: string;
  radioId?: string;
}): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY no definida");
  }

  const response = await fetch(
    `${ELEVENLABS_TTS_URL}/${encodeURIComponent(params.vozId)}?output_format=${encodeURIComponent(ELEVENLABS_OUTPUT_FORMAT)}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/wav, audio/pcm, audio/mpeg",
      },
      body: JSON.stringify({
        text: params.texto,
        model_id: ELEVENLABS_MODEL_ID,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.9,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "sin detalle");
    let parsedCode: string | undefined;
    try {
      const parsedDetails = JSON.parse(details) as { detail?: { code?: string } };
      parsedCode = parsedDetails.detail?.code;
    } catch {
      // Si no llega JSON, mantenemos el detalle raw para diagnóstico.
    }
    throw new ElevenLabsApiError(`ElevenLabs TTS fallo (${response.status}): ${details}`, response.status, parsedCode);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  if (params.radioId) {
    await registrarConsumoElevenLabs({
      radioId: params.radioId,
      caracteres: params.texto.length,
      modelo: ELEVENLABS_MODEL_ID,
    }).catch(() => undefined);
  }
  return decodePcmToWav(audioBuffer, response.headers.get("content-type"));
}

export async function synthesizeElevenLabsBuffer(params: {
  texto: string;
  vozId: string;
  radioId?: string;
}): Promise<{ buffer: Buffer; mimeType: string }> {
  const resolvedVoiceId = params.vozId || ELEVENLABS_DEFAULT_VOICE_ID;
  let audioBuffer: Buffer;
  let voiceIdUsado = resolvedVoiceId;

  try {
    audioBuffer = await generateWithElevenLabs({ texto: params.texto, vozId: voiceIdUsado, radioId: params.radioId });
  } catch (error) {
    const isPaidPlanVoiceError =
      error instanceof ElevenLabsApiError && error.status === 402 && error.code === "paid_plan_required";
    const canFallback = isPaidPlanVoiceError && voiceIdUsado !== ELEVENLABS_FREE_FALLBACK_VOICE_ID;

    if (!canFallback) {
      throw error;
    }

    voiceIdUsado = ELEVENLABS_FREE_FALLBACK_VOICE_ID;
    audioBuffer = await generateWithElevenLabs({ texto: params.texto, vozId: voiceIdUsado, radioId: params.radioId });
  }

  const mimeType = ELEVENLABS_OUTPUT_FORMAT.startsWith("mp3") ? "audio/mpeg" : "audio/wav";
  return { buffer: audioBuffer, mimeType };
}

export async function generarAudio(params: {
  texto: string;
  vozId: string;
  outputPath: string;
  radioId?: string;
}): Promise<{ duracion: number; path: string; mimeType: string }> {
  const { buffer: audioBuffer, mimeType } = await synthesizeElevenLabsBuffer({
    texto: params.texto,
    vozId: params.vozId,
    radioId: params.radioId,
  });

  await writeFile(params.outputPath, audioBuffer);

  let duracion = 0;
  try {
    duracion = await getAudioDuration(params.outputPath);
  } catch (error) {
    throw new Error(
      `No se pudo leer el audio generado por ElevenLabs (bytes=${audioBuffer.length}, voiceId=${params.vozId}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  return { duracion, path: params.outputPath, mimeType };
}
