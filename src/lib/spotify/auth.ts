import type { SpotifyConexion } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TOKEN_URL = "https://accounts.spotify.com/api/token";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

function getSpotifyCredentials(): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Spotify OAuth no configurado (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI)");
  }
  return { clientId, clientSecret, redirectUri };
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
}> {
  const { clientId, clientSecret, redirectUri } = getSpotifyCredentials();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Spotify token exchange: ${res.status} ${t}`);
  }
  const json = (await res.json()) as TokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? "",
    expiresInSec: json.expires_in,
  };
}

export async function refreshSpotifyTokens(conexion: SpotifyConexion): Promise<SpotifyConexion> {
  const { clientId, clientSecret } = getSpotifyCredentials();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: conexion.refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Spotify refresh: ${res.status} ${t}`);
  }
  const json = (await res.json()) as TokenResponse;
  const refreshToken = json.refresh_token ?? conexion.refreshToken;
  const tokenExpiresAt = new Date(Date.now() + json.expires_in * 1000);
  return prisma.spotifyConexion.update({
    where: { id: conexion.id },
    data: {
      accessToken: json.access_token,
      refreshToken,
      tokenExpiresAt,
    },
  });
}

export async function getAccessTokenFresco(conexion: SpotifyConexion): Promise<string> {
  const margenMs = 5 * 60 * 1000;
  if (conexion.tokenExpiresAt.getTime() - Date.now() < margenMs) {
    const actualizada = await refreshSpotifyTokens(conexion);
    return actualizada.accessToken;
  }
  return conexion.accessToken;
}

export const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");
