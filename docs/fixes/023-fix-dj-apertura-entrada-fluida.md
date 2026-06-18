# Fix: Modo DJ — intro-apertura no menciona primera canción y entrada no es fluida
> Status: DONE
> v1 | 2026-05-26

## Bug
1. La intro de apertura del modo DJ no menciona la primera canción que va a sonar, aunque el feature 034 ya está implementado en el código.
2. Cuando termina la intro-apertura, la música de Spotify arranca de golpe a volumen completo en lugar de hacer un fade-in suave desde el silencio.

## Root cause

### Bug 1 — cache de intro no invalida al regenerar
`src/lib/spotify/generarIntroApertura.ts:14-23` — la función `introCacheValida` devuelve `true` si el archivo `intro-{sesionId}.mp3` tiene menos de 30 minutos. Como el `audioFinal` lleva solo el `sesionId` como clave (`intro-${sesionId}.mp3`), si la intro fue generada antes de que el feature 034 se desplegase (sin mención de primera canción), el archivo antiguo se sigue sirviendo dentro de la ventana de 30 min, o si el operador lanzó el modo DJ hace menos de 30 min.

El `playlistId` no forma parte del nombre del archivo, así que cambiar de playlist tampoco invalida el cache.

### Bug 2 — Spotify arranca sin fade-in después de la intro
`src/components/spotify/SpotifyPanel.tsx:420-433` — después de que `ejecutarIntroApertura()` resuelve, el código hace `PUT /me/player/play` con `play: true` sin modificar el volumen. El player fue inicializado en `volume: 0.85`, por lo que la música entra de golpe a volumen completo, cortando bruscamente contra el silencio post-intro.

## Fix

### Fix 1 — incluir playlistId en el nombre del archivo de cache
`src/lib/spotify/generarIntroApertura.ts` — modificar `introAudioPath(sesionId)` para aceptar un segundo parámetro `playlistId?: string | null` y añadir un sufijo hash de los primeros 8 caracteres del `playlistId` al nombre del archivo: `intro-${sesionId}-${playlistHash}.mp3`. Cuando `playlistId` es null, usar `intro-${sesionId}.mp3` como fallback para preservar compatibilidad. Actualizar todas las llamadas a `introAudioPath`.

### Fix 2 — fade-in de Spotify al arrancar después de la intro
`src/components/spotify/SpotifyPanel.tsx` — en el listener `ready`, antes del `PUT /me/player/play`:
1. Bajar el volumen del player a 0 vía `player.setVolume(0)`.
2. Iniciar reproducción (`PUT /me/player/play`).
3. Hacer fade-in de 0 a `volumeRef.current` (0.85) en 2 500 ms usando `fadeSpotifyPlayerVolume` (función ya existente en el módulo).

## Notes
- `fadeSpotifyPlayerVolume` ya existe y está en scope del mismo `useEffect`. No hay que añadirla.
- El `TIMEOUT_INTRO_APERTURA_MS` ya protege contra intros que no llegan; el fade-in ocurre solo si la intro se reprodujo normalmente.
- El fade-in también aplica cuando la intro falla y `ejecutarIntroApertura` retorna null: Spotify igual debe arrancar con fade para no asustar al operador.

## Verify
1. Crear o invalidar la intro existente (esperar >30 min o borrar el archivo `intro-{sesionId}*.mp3`).
2. Entrar al modo DJ → la intro debe terminar con "...y arrancamos con '[nombre]' de [artista]".
3. Al terminar la intro, la música debe entrar en silencio y subir gradualmente en ~2.5 s.
4. Cambiar de sesión (distinto playlistId) → debe generarse una nueva intro con la primera canción de la nueva playlist.

## Changelog
- v1 (2026-05-26): dos bugs: cache sin invalidación por playlistId y Spotify sin fade-in post-intro
