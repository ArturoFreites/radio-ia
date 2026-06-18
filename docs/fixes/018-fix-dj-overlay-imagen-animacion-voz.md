# Fix: Modo DJ — overlay sin imagen y sin animación de voz

> Status: DONE
> v1 | 2026-05-26

## Bug
El modal que aparece mientras se reproduce la voz de presentación no muestra la imagen de portada del siguiente tema. Tampoco hay ningún indicador visual de que la voz está en curso.

## Root cause
- `src/components/spotify/PresentacionOverlay.tsx:4,33-36` — Usa `Image` de Next.js con `fill` y `sizes="192px"` fijos; este componente puede fallar silenciosamente con URLs dinámicas del CDN de Spotify (`i.scdn.co`). El resto del codebase (`SpotifyPanel.tsx` líneas 535–552) usa `<img>` nativo con `onError` fallback para portadas de Spotify
- `src/components/spotify/PresentacionOverlay.tsx` — No existe ninguna animación ni indicador visual mientras `audioProgress > 0`

## Fix

### Imagen
- Eliminar la importación de `Image` de Next.js
- Reemplazar el bloque de portada con `<img>` nativo + estado local `coverFallida: boolean`
- Añadir `onError={() => setCoverFallida(true)}` en el `<img>` y mostrar el fallback emoji cuando `coverFallida` o cuando no hay `cover`

### Animación de voz
- Añadir 5 barras verticales con animación CSS: keyframe `waveBar` que oscila la altura entre 4px y 28px en un ciclo de 0.8 s con `animation-timing-function: ease-in-out` y `animation-iteration-count: infinite`
- Cada barra tiene un `animation-delay` escalonado: 0ms, 120ms, 240ms, 360ms, 480ms
- El grupo de barras solo es visible cuando `audioProgress > 0 && audioProgress < 1`
- Posicionar las barras centradas entre los metadatos del tema y la barra de progreso

## Verify
1. Esperar a que el overlay aparezca durante una transición → la portada de la siguiente canción debe verse
2. Mientras el overlay está activo, las 5 barras deben oscilar con animación visible
3. Al cerrarse el overlay, la animación desaparece junto con el resto del contenido

## Changelog
- v1 (2026-05-26): inicial
