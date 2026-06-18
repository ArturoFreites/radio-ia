import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionRadioId } from "@/lib/session";
import { getRedis } from "@/lib/redis";
import { SPOTIFY_SCOPES } from "@/lib/spotify/auth";

const OAUTH_STATE_PREFIX = "spotify:oauth:";
const STATE_TTL_SEC = 600;

export async function GET(): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI?.trim();
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Spotify no configurado en el servidor" }, { status: 503 });
  }

  const state = randomBytes(24).toString("hex");
  await getRedis().setex(`${OAUTH_STATE_PREFIX}${state}`, STATE_TTL_SEC, radioId);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    state,
  });
  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
}
