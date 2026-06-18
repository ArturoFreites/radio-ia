const REQUIRED_ENV = [
  "DATABASE_URL",
  "REDIS_URL",
  "GEMINI_API_KEY",
  "ELEVENLABS_API_KEY",
  "NEXTAUTH_SECRET",
  "AUDIO_STORAGE_PATH",
] as const;

export function assertEnv(): void {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      throw new Error(`Variable de entorno requerida: ${key}`);
    }
  }
}
