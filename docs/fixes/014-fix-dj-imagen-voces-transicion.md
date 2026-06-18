# Fix: DJ mode — imagen rota, voces que no generan y transiciones bloqueadas
> Status: DONE
> v1 | 2026-05-26

## Bug

En la vista `/aire` con modo DJ activo se dan tres síntomas simultáneos:

1. **Imagen del álbum rota** — aparece un ícono de imagen rota en lugar del cover de la canción.
2. **Voces no se generan** — aunque la sesión tenga voces configuradas, la presentación del siguiente tema nunca se procesa o el operador nunca lo confirma visualmente.
3. **Transición bloqueada** — cuando un tema llega a los últimos 12 segundos, el reproductor se pausa y nunca reanuda; la siguiente canción no empieza.

## Root causes

### Bug 1 — Imagen rota
`src/components/spotify/SpotifyPanel.tsx:440`

`<Image>` de `next/image` con `fill` requiere que la URL del src esté en `remotePatterns` de `next.config.ts`. El SDK de Spotify Web Playback puede devolver imágenes desde dominios no configurados (p. ej. `image-cdn-ak.spotifycdn.com`, `image-cdn-fa.spotifycdn.com`). Cuando el dominio no está en el allowlist, Next.js bloquea la carga y muestra imagen rota. No hay handler `onError` que muestre el ícono de fallback.

### Bug 2 — Voces no generan / transición bloqueada (mismo origen)
`src/components/spotify/SpotifyPanel.tsx:137` — función `pedirPresentacion`

El `fetch` POST a `/api/spotify/sesion/[id]/presentacion` se llama pero su respuesta se descarta. Cuando la sesión **no tiene voces configuradas**, la API retorna `{ estado: "LISTA" }` inmediatamente y no encola ningún job → no emite ningún evento SSE `PRESENTACION_LISTA`. El frontend sigue esperando ese evento indefinidamente.

Cuando el tema llega a los últimos 12 s (`UMBRAL_BLOQUEO_MS`), `bloqueoActivo` se activa, el player se pausa (`esperandoPresentacionRef.current = true`), y nunca se reanuda porque el SSE nunca llega.

Hay que distinguir dos sub-casos:
- **Sin voces**: API retorna `LISTA` sin audio → no hay SSE → frontend queda colgado.
- **Con voces pero worker caído**: el job se encola pero nadie lo procesa → tampoco llega SSE → mismo bloqueo.

Para el segundo caso no hay timeout de seguridad.

## Fix

### Fix 1 — Imagen del álbum
`src/components/spotify/SpotifyPanel.tsx`

Reemplazar `<Image fill>` de `next/image` por un `<img>` nativo con `onError`. El handler de error pone un estado local que muestra el ícono ♪ en su lugar.

Comportamiento:
- Si `coverUrl` está definida → renderizar `<img src={coverUrl}>` con `object-cover` y tamaño completo del contenedor.
- Si `coverUrl` es null/undefined ó la imagen falla al cargar (`onError`) → mostrar el `<div>` con ícono ♪ que ya existe en el else.

No tocar `next.config.ts` — el bypass correcto es usar `<img>` nativo para fuentes externas sin control de dominio.

### Fix 2 — Voces / transición bloqueada

`src/components/spotify/SpotifyPanel.tsx` — función `pedirPresentacion`:

Leer la respuesta del POST. Si el body devuelve `{ estado: "LISTA" }` (sin voces → sin audio), aplicar exactamente la misma lógica que el handler SSE `PRESENTACION_ERROR`:
- `presentacionFallidaTrackIdRef.current = track.id`
- `esperandoPresentacionRef.current = false`
- `pausaBloqueoSolicitadaRef.current = false`
- `playerRef.current?.resume()` (por si ya estaba pausado esperando)
- `setPresentacionEstado("idle")`

Esto evita el bloqueo cuando no hay voces.

`src/components/spotify/SpotifyPanel.tsx` — añadir timeout de seguridad:

En el momento en que `pausaBloqueoSolicitadaRef.current` pasa a `true` (player pausado esperando), iniciar un `setTimeout` de 25 s. Si al dispararse `esperandoPresentacionRef.current` sigue siendo `true`, ejecutar la misma lógica de fallback (resume + marcar como fallida). Limpiar el timeout si el SSE llega antes.

## Files

### Modify
- `src/components/spotify/SpotifyPanel.tsx` — Fix 1 (imagen nativa con fallback) + Fix 2 (leer respuesta POST, timeout de seguridad 25 s)

## Contracts

Sin cambios de tipos ni API. Todos los cambios son internos a `SpotifyPanel`.

## Notes

- El timeout de 25 s cubre el caso de worker caído o latencia extrema de ElevenLabs. No debe ser menor a 20 s porque ElevenLabs puede tardar hasta 15 s en una línea lenta.
- `presentacionFallidaTrackIdRef` ya existe y es el mecanismo correcto para desbloquear — no inventar uno nuevo.
- El ícono ♪ del fallback ya está en el JSX (`<div className="flex aspect-square w-full items-center justify-center rounded-xl bg-zinc-900 text-6xl">♪</div>`). Reutilizarlo, no duplicarlo.
- No agregar padding extra al panel en este fix; el espaciado del reproductor es un issue de UX separado.

## Verify

1. Abrir `/aire?token=...` con un slot DJ activo y Spotify reproduciendo.
2. **Imagen**: el cover del álbum debe mostrarse correctamente. Si Spotify devuelve una URL de dominio no configurado, se muestra el ícono ♪ en su lugar (nunca imagen rota).
3. **Sin voces**: en una sesión sin voces configuradas, reproducir hasta los últimos 12 s del tema → el player NO se pausa; el siguiente tema arranca automáticamente.
4. **Con voces**: en una sesión con voces configuradas, el reproductor pausa cerca del final, suena la locución, y retoma con el siguiente tema.
5. **Worker caído**: detener el worker y reproducir hasta el final de un tema → después de ≤ 25 s de pausa, el reproductor reanuda solo y pasa al siguiente tema.

## Changelog
- v1 (2026-05-26): diagnóstico y spec inicial — 2 bugs distintos (imagen y bloqueo de transición), mismo archivo de fix
