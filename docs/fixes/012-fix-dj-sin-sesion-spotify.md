# Fix: DJ slot en IDLE por ausencia de SpotifySesion
> Status: DONE
> v1 | 2026-05-26

## Bug
El slot DJ muestra "Sin programación activa" aunque Spotify esté conectado. El modo DJ no arranca.

## Root cause

**Gap entre feature 009 y 007:**
- `009-feature-dj-simplificado.md` (DONE) eliminó el formulario "Nueva sesión DJ" de `/spotify`.
- `007-feature-dj-playlist-por-slot.md` (TODO) que lo reemplaza con playlist por slot, no está implementado.
- El sistema quedó sin mecanismo para crear `SpotifySesion` → la tabla está vacía → `spotifySesion: null` → IDLE.

**Cadena exacta:**
`src/app/api/aire/estado/route.ts` — el `findFirst` filtra `{ estado: ACTIVA }`. Sin sesiones en la tabla, devuelve `null`. En `AireController`, `spotifyOk = Boolean(sesionActiva)` → `false`. En `desiredModo`: `ahora.tipo === "DJ" → spotifyOk ? "DJ" : "IDLE"` → **IDLE**.

## Fix

Dos cambios independientes:

**1. Restaurar creación de sesión en `/spotify`**

`src/app/(dashboard)/spotify/page.tsx` — volver a renderizar `<SpotifySetup>` cuando `conexion !== null`. El componente `SpotifySetup` ya existe en `src/components/spotify/SpotifySetup.tsx` con el formulario completo (playlist + voces). Solo hay que pasarle las `sesiones` activas de la radio (query a `SpotifySesion` donde `radioId`).

`src/app/(dashboard)/spotify/page.tsx` debe:
- Importar `SpotifySetup` (ya existe).
- Cuando `conexion !== null`: query `prisma.spotifySesion.findMany({ where: { radioId }, orderBy: { createdAt: "desc" } })` y pasarlas como prop `sesiones`.
- Renderizar `<SpotifySetup conectado sesiones={...} alerta exito />` debajo del `SpotifyOAuthPanel`.
- Cuando `conexion === null`: solo mostrar `SpotifyOAuthPanel` (estado actual).

**2. Lookup de sesión tolerante en `/api/aire/estado`**

`src/app/api/aire/estado/route.ts` — cambiar el `findFirst` de `SpotifySesion`:

Comportamiento actual (filtro estricto):
```
where: { radioId: radio.id, estado: EstadoSesionSpotify.ACTIVA }
```

Comportamiento nuevo (tolerante):
- Primero buscar una sesión `ACTIVA` (orden por `updatedAt desc`). Si existe, usarla.
- Si no hay `ACTIVA`, buscar la sesión más reciente sin filtrar por estado (orden por `createdAt desc`).
- Si no hay ninguna sesión, `spotifySesion: null` (comportamiento actual).

Esto garantiza que una sesión existente (aunque su `estado` no sea `ACTIVA`) permita al slot DJ arrancar.

## Verify

1. Ir a `/spotify` y crear una sesión DJ eligiendo playlist y voces → debería aparecer el formulario.
2. Una vez creada la sesión, entrar a `/aire?token=...` cuando el slot DJ está activo → el reproductor Spotify debe inicializarse y empezar a reproducir la playlist.

## Notes
- Este fix es una medida puente hasta que `007-feature-dj-playlist-por-slot.md` esté implementado.
- `SpotifySetup` tiene toda la lógica: carga playlists via `/api/spotify/playlists`, maneja errores 403, selector de voces, POST a `/api/spotify/sesion`.
- El cambio 2 (lookup tolerante) también puede implementarse de forma independiente: beneficia el caso donde la sesión existe pero su `estado` no es `ACTIVA` (ej. fue marcada como histórica).

## Changelog
- v1 (2026-05-26): diagnóstico inicial — gap entre 009 (DONE) y 007 (TODO) deja DJ sin mecanismo de sesión
