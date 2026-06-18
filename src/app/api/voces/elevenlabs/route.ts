import { NextResponse } from "next/server";
import { listarVocesElevenLabs } from "@/lib/elevenlabs/voces";
import { getSessionRadioId } from "@/lib/session";

export async function GET(): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY no configurada" },
      { status: 503 },
    );
  }

  try {
    const voces = await listarVocesElevenLabs();
    return NextResponse.json({
      voces: voces.map((voz) => ({
        voice_id: voz.voice_id,
        name: voz.name,
        preview_url: voz.preview_url ?? null,
        labels: voz.labels ?? {},
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al listar voces ElevenLabs";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
