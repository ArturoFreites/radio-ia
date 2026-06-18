# Fix: Presentaciones IA y diálogos entre canciones no se generan desde la Página de Aire
> Status: DONE
> v1 | 2026-05-13

## Bug
Desde `/aire`, el Modo DJ reproduce música pero nunca genera diálogos entre canciones ni presentaciones con IA. El SpotifyPanel llama a `POST /api/spotify/sesion/[id]/presentacion` pero la ruta devuelve 404 silenciosamente y la generación nunca se encola.

## Root cause
`src/app/api/spotify/sesion/[id]/presentacion/route.ts:35` — la ruta busca un registro `PresentacionTrack` existente y devuelve 404 si no existe. En modo standalone (`/panel/spotify/[sesionId]`), los tracks se pre-registran en `PresentacionTrack` al crear la sesión vía `POST /api/spotify/sesion`. En modo aire, la sesión que se usa puede ser distinta de la que se usó en standalone, o el orden de reproducción difiere del que se pre-registró, por lo que el `trackSpotifyId` del siguiente track no encuentra fila en la tabla.

El cliente (`SpotifyPanel`) solo envía `trackSpotifyId`; el servidor no puede crear el registro en el momento porque no tiene los metadatos del track.

## Fix

### En el cliente — `src/components/spotify/SpotifyPanel.tsx`

Cambiar la función `pedirPresentacion` para que acepte un `SpotifySdkTrack` completo (no solo el id) y envíe todos los metadatos necesarios en el body.

Cambiar el caller de:
```
void pedirPresentacion(trackSiguiente.id)
```
a:
```
void pedirPresentacion(trackSiguiente)
```

El body del POST debe incluir junto a `trackSpotifyId` y `panelToken`:
- `trackNombre`
- `artistaNombre` (artists concatenados con `, `)
- `albumNombre`
- `duracionMs`
- `coverUrl` (primera imagen del album o null)

### En el servidor — `src/app/api/spotify/sesion/[id]/presentacion/route.ts`

1. Ampliar `bodySchema` para aceptar los campos de metadatos opcionales.
2. En lugar de `findUnique` + 404, usar `upsert` de `PresentacionTrack`:
   - Si ya existe → no actualiza metadatos (solo garantiza que el registro existe)
   - Si no existe → lo crea con los metadatos recibidos
3. Encolar la generación normalmente si el estado del registro es `PENDIENTE` (evitar re-encolar si ya está en proceso).

## Verify
1. Abrir `/aire?token=[token]` con una sesión Spotify activa y un slot DJ.
2. Al arrancar la segunda canción, el servidor debe encolar la generación de presentación para la siguiente.
3. Antes de que termine la segunda canción, el overlay de presentación debe aparecer con el diálogo hablado.
4. En `PresentacionTrack`, deben existir filas para los tracks reproducidos, aunque no hayan sido pre-registrados al crear la sesión.

## Changelog
- v1 (2026-05-13): spec inicial — fix upsert on-demand de PresentacionTrack
