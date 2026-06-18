# Fix: Modo DJ — layout overflow y posición de reproducción trabada

> Status: DONE
> v1 | 2026-05-26

## Bug
En modo DJ en vivo (modo `aire`), el componente de reproducción llega hasta los bordes laterales de la pantalla rompiendo el diseño. El contador de segundos y la barra de progreso se congela entre eventos del SDK y no avanza de forma continua.

## Root cause
- `src/components/spotify/SpotifyPanel.tsx:484-487` — `rootClass` en `modo="aire"` no tiene padding horizontal ni vertical; el grid en línea 523 tampoco tiene padding lateral, por lo que el contenido toca los bordes de pantalla
- `src/components/spotify/SpotifyPanel.tsx:100,354-356` — `positionMs` solo se actualiza en eventos `player_state_changed` del SDK (frecuencia irregular, ~500–1500 ms); sin interpolación entre eventos la barra y el contador se traban

## Fix
- Agregar `px-6 py-8` al `rootClass` de modo `aire` para contener el contenido dentro de los márgenes de pantalla
- Añadir dos refs: `lastStateTimestampRef` (número, `Date.now()` al llegar cada evento) y `lastPositionMsRef` (número, posición en ms del último evento)
- Actualizar ambos refs en cada `player_state_changed` junto con los estados existentes
- Añadir un `setInterval` a 200 ms que, cuando la pista no está pausada, calcula `positionMs = lastPositionMsRef.current + (Date.now() - lastStateTimestampRef.current)`, limitado por `durationMs`; limpiar el intervalo en el cleanup del efecto

## Verify
1. Abrir la página de aire en modo DJ — el contenido debe estar separado de los bordes con margen visible en todas las resoluciones
2. Con una canción reproduciéndose, el contador de segundos debe avanzar de forma continua (cada ~200 ms), sin trabarse entre eventos del SDK

## Changelog
- v1 (2026-05-26): inicial
