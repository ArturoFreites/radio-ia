export interface ElevenLabsVoz {
  voice_id: string;
  name: string;
  preview_url?: string;
  labels?: Record<string, string>;
}

export async function listarVocesElevenLabs(): Promise<ElevenLabsVoz[]> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY no configurada");
  }
  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ElevenLabs voices ${response.status}: ${text}`);
  }
  const data = (await response.json()) as { voices?: ElevenLabsVoz[] };
  return data.voices ?? [];
}
