# Fix: Modo DJ no arranca desde la grilla
> Status: DONE
> v1 | 2026-05-13

## Bug
La Página de Aire tiene un slot DJ activo en la grilla y una sesión Spotify configurada, pero permanece en IDLE y no inicia la reproducción.

## Root cause
`src/components/aire/AireController.tsx:31` — `spotifyOk` se deriva del prop estático `spotifySesionActiva` que el server component calcula una sola vez al cargar la página. El polling de 30 s actualiza `estado` (slot activo, etc.) pero `spotifyOk` nunca se recalcula. Si la sesión Spotify no existía en el momento de cargar `/aire`, o se creó después, el controlador nunca la detecta y mantiene IDLE indefinidamente aunque el slot DJ esté activo.

## Fix

**`src/types/grilla.ts`**
Agregar campo opcional a `EstadoAire`:
```typescript
spotifySesion: {
  sesionId: string
  panelToken: string
  playlistId: string
  playlistNombre: string
} | null
```

**`src/app/api/aire/estado/route.ts`**
Incluir en la query la sesión Spotify activa de la radio (misma lógica que el server component de `aire/page.tsx`) y poblar `body.spotifySesion`.

**`src/components/aire/AireController.tsx`**
- Derivar `sesionActiva` y `spotifyOk` de `estado.spotifySesion` (vivo, se actualiza con cada poll) en lugar del prop estático
- El prop `spotifySesionActiva` puede mantenerse solo para el arranque inicial (primer render antes del primer fetch), pero debe ser sobreescrito por `estado.spotifySesion` en cuanto llega la primera respuesta
- `ModoDJ` debe recibir los datos de sesión desde `estado.spotifySesion` en lugar del prop estático

## Verify
1. Cargar `/aire` sin sesión Spotify activa → muestra IDLE
2. Crear una sesión Spotify desde el dashboard (sin recargar `/aire`)
3. Dentro de los próximos 30 s, la página debe detectar la sesión y cambiar a modo DJ automáticamente
4. Configurar un slot DJ activo en la grilla → la página cambia a DJ al activarse el slot sin recargar

## Changelog
- v1 (2026-05-13): bug identificado — prop estático de sesión Spotify nunca se recalcula con el polling
