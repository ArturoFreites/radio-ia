# Fix: Publicidad demo sin fade en modo DJ

> Status: DONE
> v1 | 2026-06-01

## Bug

Al reproducir la publicidad demo mientras Spotify está sonando en modo DJ, el audio de la cuña se superpone con la música sin ningún fade out/in. Ambos sonidos se escuchan al mismo tiempo.

## Root cause

`src/components/aire/AireController.tsx:248` — `reproducirAudioDemo` solo ejecuta `programRef.current?.fadeOutStop` cuando `modo === "PROGRAMA"`. Cuando `modo === "DJ"`, no hay ningún control sobre el volumen de Spotify antes ni después de reproducir el audio demo.

Además, `ModoDJ` no expone ningún handle para controlar el volumen de `SpotifyPanel`, aunque `SpotifyPanel` ya tiene `fadeOutPause`/`fadeInResume` en su `SpotifyPanelHandle`.

## Fix

1. Convertir `ModoDJ` en un componente con `forwardRef` que exponga un handle con `fadeOutPause(ms?)` y `fadeInResume(ms?)`, delegando directamente en `SpotifyPanel`.
2. En `AireController`, crear un `djRef = useRef<ModoDJHandle>()` y pasárselo a `<ModoDJ ref={djRef} …>`.
3. En `reproducirAudioDemo`, añadir el bloque para modo DJ equivalente al de modo PROGRAMA:
   - Antes de reproducir: `await djRef.current?.fadeOutPause(1500)`
   - Después de reproducir: si `modoAlInicio === "DJ"` y `modo === "DJ"`, llamar `await djRef.current?.fadeInResume(1500)`

El handle de `ModoDJHandle` debe ser idéntico en forma a `SpotifyPanelHandle` (mismos métodos, misma firma) para poder reutilizar el mismo patrón que ya existe con `programRef`.

## Verify

1. Con una canción sonando en modo DJ, abrir el modal de publicidad demo y reproducir una cuña.
2. Esperar: la música hace fade out (~1.5 s), se escucha solo la cuña, luego la música hace fade in (~1.5 s).
3. Confirmar que en ningún momento se superponen los dos audios.
4. Verificar también que si el modo cambia durante la cuña (ej. programa arranca), el fade in de Spotify no se ejecuta.

## Changelog

- v1 (2026-06-01): spec inicial
