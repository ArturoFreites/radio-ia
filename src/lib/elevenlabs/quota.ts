export type ElevenLabsQuota = {
  creditosRestantes: number;
  creditosTotal: number;
  creditosUsados: number;
  porcentajeUsado: number;
};

type SubscriptionResponse = {
  character_count: number;
  character_limit: number;
};

const SUBSCRIPTION_URL = "https://api.elevenlabs.io/v1/user/subscription";

export function getUmbralAlerta(): number {
  const raw = process.env.ELEVENLABS_QUOTA_ALERTA_MIN;
  if (raw === undefined || raw === "") return 500;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 500;
}

export function getUmbralBloqueo(): number {
  const raw = process.env.ELEVENLABS_QUOTA_BLOQUEO_MIN;
  if (raw === undefined || raw === "") return 100;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 100;
}

function parseSubscription(body: unknown): ElevenLabsQuota {
  if (typeof body !== "object" || body === null) {
    throw new Error("Respuesta de suscripción ElevenLabs inválida");
  }
  const data = body as SubscriptionResponse;
  if (
    typeof data.character_count !== "number" ||
    typeof data.character_limit !== "number"
  ) {
    throw new Error("Respuesta de suscripción ElevenLabs inválida");
  }

  const creditosTotal = data.character_limit;
  const creditosUsados = Math.max(0, data.character_count);
  const creditosRestantes = Math.max(0, creditosTotal - creditosUsados);
  const porcentajeUsado =
    creditosTotal > 0
      ? Math.min(100, Math.round((creditosUsados / creditosTotal) * 100))
      : 0;

  return { creditosRestantes, creditosTotal, creditosUsados, porcentajeUsado };
}

export async function consultarCuotaElevenLabs(): Promise<ElevenLabsQuota> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY no configurada");
  }

  const response = await fetch(SUBSCRIPTION_URL, {
    method: "GET",
    headers: { "xi-api-key": apiKey },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `ElevenLabs subscription HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }

  const body: unknown = await response.json();
  return parseSubscription(body);
}
