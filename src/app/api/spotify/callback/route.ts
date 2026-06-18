import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { exchangeCodeForTokens } from "@/lib/spotify/auth";
import { fetchSpotifyUserProfile } from "@/lib/spotify/api";

const OAUTH_STATE_PREFIX = "spotify:oauth:";

function baseUrl(): string {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const redirectSpotify = NextResponse.redirect(`${baseUrl()}/spotify${err ? `?error=${encodeURIComponent(err)}` : ""}`);

  if (err || !code || !state) {
    return redirectSpotify;
  }

  const redis = getRedis();
  const radioId = await redis.get(`${OAUTH_STATE_PREFIX}${state}`);
  if (!radioId) {
    return NextResponse.redirect(`${baseUrl()}/spotify?error=oauth_state_invalido`);
  }
  await redis.del(`${OAUTH_STATE_PREFIX}${state}`);

  try {
    const tokens = await exchangeCodeForTokens(code);
    const profile = await fetchSpotifyUserProfile(tokens.accessToken);
    const tokenExpiresAt = new Date(Date.now() + tokens.expiresInSec * 1000);

    await prisma.spotifyConexion.upsert({
      where: { radioId },
      create: {
        radioId,
        spotifyUserId: profile.id,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt,
      },
      update: {
        spotifyUserId: profile.id,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt,
      },
    });
  } catch {
    return NextResponse.redirect(`${baseUrl()}/spotify?error=spotify_token`);
  }

  return NextResponse.redirect(`${baseUrl()}/spotify?connected=1`);
}
