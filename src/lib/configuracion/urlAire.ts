import { headers } from "next/headers";

async function resolveAppBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return (process.env.NEXTAUTH_URL ?? `${proto}://${host}`).replace(/\/$/, "");
}

export async function buildUrlAire(aireToken: string): Promise<string> {
  const base = await resolveAppBaseUrl();
  return `${base}/cabina?token=${encodeURIComponent(aireToken)}`;
}
