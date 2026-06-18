import { NextResponse } from "next/server";
import { consultarCuotaElevenLabs } from "@/lib/elevenlabs/quota";
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
    const quota = await consultarCuotaElevenLabs();
    return NextResponse.json(quota);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al consultar cuota ElevenLabs";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
