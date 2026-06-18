# Fix: Modo DJ — voz única en grilla, generación bloqueada y primer canción en intro
> Status: DONE
> v1 | 2026-05-26

## Bug
Tres síntomas relacionados al migrar el modo DJ a 1 sola voz:
1. El formulario de grilla muestra "Locutor A" y "Locutor B" cuando debe mostrar solo uno.
2. En la página de aire, el modo DJ no genera voces entre canciones.
3. La intro de apertura no menciona la primera canción de la playlist.

## Root cause

**Bug 1 — doble selector de voz:**
`src/components/grilla/SlotForm.tsx:250-268` — `DjTipoCampo` renderiza un grid con dos `<Select>` (Locutor A y Locutor B). El componente tiene props `voz2Id`/`onVoz2Change` que ya no corresponden.

**Bug 2 — generación bloqueada:**
`src/app/api/spotify/sesion/[id]/presentacion/route.ts:87` — La guarda es `if (!sesion.voz1Id || !sesion.voz2Id)`. Como `voz2Id` ya no se guarda (es null), la condición es siempre verdadera: devuelve `LISTA` sin audio sin encolar generación.

**Bug 3 — playlist ID sin normalizar:**
`src/lib/spotify/generarIntroApertura.ts:54` — `fetchPlaylistTracksFirstPage(accessToken, playlistId)` recibe el `playlistId` en formato URI `spotify:playlist:XXXXX` (así se guarda en sesión). La función construye la URL `/playlists/spotify%3Aplaylist%3AXXXXX/tracks`, que devuelve 404 en silencio. El bloque `catch` retorna `undefined`, la intro se genera sin mención de canción.

## Fix

**Bug 1:**
En `DjTipoCampo`, eliminar el segundo `<Select>` ("Locutor B") y el prop `voz2Id`/`onVoz2Change`.
En `SlotForm`, eliminar el state `voz2Id`, la inicialización de `voz2Id` desde `vocesInicialDesdeTarget`, y el campo `voz2Id` del body enviado al API (o mantenerlo como `null` hardcodeado).

**Bug 2:**
Cambiar la guarda en `responderEstadoPresentacion`:
- De: `if (!sesion.voz1Id || !sesion.voz2Id)`
- A: `if (!sesion.voz1Id)`

**Bug 3:**
En `resolverPrimeraCancion` dentro de `generarIntroApertura.ts`, normalizar el `playlistId` antes de pasarlo a `fetchPlaylistTracksFirstPage`:
```
import { normalizePlaylistId } from "@/lib/spotify/playlistId"
const tracks = await fetchPlaylistTracksFirstPage(accessToken, normalizePlaylistId(playlistId));
```

## Verify

1. Abrir la grilla → crear slot tipo DJ → verificar que aparece un solo selector de voz (no dos).
2. Activar modo DJ en la página de aire con una voz configurada → en la barra "A continuación" debe aparecer "Generando voz…" y luego "Voz lista ✓" antes de cada transición.
3. Iniciar modo DJ con playlist con canciones → la intro de apertura debe terminar mencionando la primera canción de la playlist. (Borrar caché: eliminar el archivo `intro-{sesionId}-*.mp3` en storage si ya existe uno antiguo.)

## Changelog
- v1 (2026-05-26): spec inicial — tres bugs derivados de la migración a voz única
