/** gemini-2.5-flash — https://ai.google.dev/gemini-api/docs/pricing (jun 2026) */
export const GEMINI_TEXT_MODEL_LABEL = "gemini-2.5-flash";
export const GEMINI_COST_INPUT_USD_PER_1M_DEFAULT = 0.3;
export const GEMINI_COST_OUTPUT_USD_PER_1M_DEFAULT = 2.5;

/** ElevenLabs TTS — Flash/Turbo vs Multilingual v2/v3 */
export const ELEVENLABS_COST_FLASH_USD_PER_1K_CHARS_DEFAULT = 0.05;
export const ELEVENLABS_COST_MULTILINGUAL_USD_PER_1K_CHARS_DEFAULT = 0.1;

function parseEnvFloat(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getGeminiCostInputUsdPer1M(): number {
  return parseEnvFloat(process.env.GEMINI_COST_INPUT_USD_PER_1M, GEMINI_COST_INPUT_USD_PER_1M_DEFAULT);
}

export function getGeminiCostOutputUsdPer1M(): number {
  return parseEnvFloat(process.env.GEMINI_COST_OUTPUT_USD_PER_1M, GEMINI_COST_OUTPUT_USD_PER_1M_DEFAULT);
}

export function getElevenLabsCostFlashUsdPer1KChars(): number {
  return parseEnvFloat(
    process.env.ELEVENLABS_COST_FLASH_USD_PER_1K_CHARS,
    ELEVENLABS_COST_FLASH_USD_PER_1K_CHARS_DEFAULT,
  );
}

export function getElevenLabsCostMultilingualUsdPer1KChars(): number {
  return parseEnvFloat(
    process.env.ELEVENLABS_COST_MULTILINGUAL_USD_PER_1K_CHARS,
    ELEVENLABS_COST_MULTILINGUAL_USD_PER_1K_CHARS_DEFAULT,
  );
}

export function esModeloElevenLabsFlashTurbo(modelo?: string): boolean {
  const id = (modelo ?? process.env.ELEVENLABS_MODEL_ID ?? "eleven_turbo_v2_5").toLowerCase();
  return id.includes("turbo") || id.includes("flash");
}

export function resolverTarifaElevenLabsUsdPor1K(modelo?: string): number {
  if (esModeloElevenLabsFlashTurbo(modelo)) {
    return getElevenLabsCostFlashUsdPer1KChars();
  }
  const id = (modelo ?? "").toLowerCase();
  if (id.includes("multilingual") || id.includes("multilingue")) {
    return getElevenLabsCostMultilingualUsdPer1KChars();
  }
  // Preview sin modelo explícito → multilingual v2 por defecto en el código
  if (!modelo && (process.env.ELEVENLABS_PREVIEW_MODEL_ID ?? "eleven_multilingual_v2").includes("multilingual")) {
    return getElevenLabsCostMultilingualUsdPer1KChars();
  }
  return getElevenLabsCostFlashUsdPer1KChars();
}

export function etiquetaTarifaElevenLabs(modelo?: string): string {
  const tarifa = resolverTarifaElevenLabsUsdPor1K(modelo);
  const familia = esModeloElevenLabsFlashTurbo(modelo) ? "Flash/Turbo" : "Multilingual v2/v3";
  return `${familia} · $${tarifa.toFixed(2)}/1K chars`;
}

export function calcularCostoGeminiUsd(tokensEntrada: number, tokensSalida: number): number {
  const inputRate = getGeminiCostInputUsdPer1M();
  const outputRate = getGeminiCostOutputUsdPer1M();
  return (tokensEntrada / 1_000_000) * inputRate + (tokensSalida / 1_000_000) * outputRate;
}

export function calcularCostoElevenLabsUsd(caracteres: number, modelo?: string): number {
  return (caracteres / 1000) * resolverTarifaElevenLabsUsdPor1K(modelo);
}

export function formatearUsd(valor: number): string {
  if (valor < 0.01 && valor > 0) {
    return `$${valor.toFixed(4)}`;
  }
  return `$${valor.toFixed(2)}`;
}

export function formatearTokens(cantidad: number): string {
  if (cantidad >= 1_000_000) {
    return `${(cantidad / 1_000_000).toFixed(2)}M`;
  }
  if (cantidad >= 1000) {
    return `${(cantidad / 1000).toFixed(1)}k`;
  }
  return cantidad.toLocaleString("es-AR");
}
