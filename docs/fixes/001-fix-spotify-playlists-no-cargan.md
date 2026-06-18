# Fix: Playlists de Spotify no cargan en Modo DJ
> Status: DONE
> v2 | 2026-05-04

## Bug
Al entrar a `/spotify` con cuenta conectada, el dropdown de playlists aparece vacío. `GET /api/spotify/playlists` devuelve 502 con `{"error":"Error al listar playlists"}`.

## Root cause

**`src/app/api/spotify/playlists/route.ts:21–32`** — El catch detecta `invalid_grant` y errores de refresh (→ 401), pero no detecta el error 403 de Spotify. Cuando el token no tiene el scope `playlist-read-private` (conectado antes de que ese scope se agregara a `SPOTIFY_SCOPES`), Spotify devuelve 403 → el catch lo trata como error genérico → 502.

El mensaje genérico tampoco ayuda al usuario a saber que tiene que reconectar con nuevos permisos.

> Nota: los guards de `p.images ?? []` y `data.items ?? []` en `src/lib/spotify/api.ts:46-51` ya estaban en el código. No era ese el bug.

## Fix

**Aplicado directamente (no pendiente en Cursor):**

`src/app/api/spotify/playlists/route.ts` — agregar bloque en catch que detecta `": 403 "` en el mensaje de error y devuelve status 403 con mensaje que pide reconectar.

`src/components/spotify/SpotifySetup.tsx` — agregar caso `status === 403` en `mensajeErrorPlaylists` que muestra el mensaje de error del servidor (que ya incluye la instrucción de reconectar).

## Verify
1. Desconectar la cuenta de Spotify desde el dashboard de Spotify Developer (revocar acceso a la app)
2. Entrar a `/spotify` → el dropdown muestra el mensaje de error específico en lugar del genérico
3. Reconectar con `/api/spotify/auth` → el nuevo token tiene `playlist-read-private` → las playlists cargan

Si el token tiene scopes correctos pero está expirado → `getAccessTokenFresco` lo refresca automáticamente → las playlists cargan sin intervención.

## Changelog
- v1 (2026-05-04): Spec inicial — identificado bug de `images: null` como causa probable
- v2 (2026-05-04): Confirmado en producción (502). Bug real es detección de 403 por scope faltante. Guards de images ya estaban presentes. Fix aplicado directamente al código.
