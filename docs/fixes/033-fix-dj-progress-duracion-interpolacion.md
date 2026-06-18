# Fix: Barra de progreso y duración se cortan en el reproductor DJ
> Status: DONE
> v1 | 2026-06-01

## Bug
En el reproductor DJ (modo aire), la barra de progreso y los tiempos elapsed/total se detienen o saltan en lugar de avanzar de forma continua. En algunos casos el contador vuelve a 0:00 sin que la canción haya cambiado.

## Root cause
Dos causas independientes:

**Causa A — Desmontaje de SpotifyPanel (dependiente de fix 031)**
`src/components/spotify/SpotifyPanel.tsx` — al desmontarse (por el bug de `SpotifyEscuchaPanel`), todos los estados se resetean a sus valores iniciales: `positionMs = 0`, `durationMs = 0`. Al remontarse, la barra vuelve a cero hasta que el SDK emite el primer `player_state_changed`.

**Causa B — Sin interpolación entre eventos del SDK**
`src/components/spotify/SpotifyPanel.tsx:492-568` — `positionMs` solo se actualiza cuando el SDK emite `player_state_changed`. El SDK **no** garantiza emisión a 1 evento/segundo; puede pasar varios segundos sin evento (especialmente si el estado no cambia). Resultado: la barra avanza a saltos perceptibles o se congela visualmente durante varios segundos.

Las refs `lastPositionMsRef` y `lastStateTimestampRef` ya existen (líneas 94-95) y son actualizadas en el listener (líneas 499-500), pero solo se usan para `dispararBloqueo`, no para actualizar la UI.

## Fix

### Interpolación de posición en SpotifyPanel
Agregar un `useEffect` con `setInterval` de ~500 ms que:
1. Si `!pausedRef.current` (música reproduciendo), calcula posición estimada: `lastPositionMsRef.current + (Date.now() - lastStateTimestampRef.current)`.
2. La acota a `[0, durationMsRef.current]`.
3. Llama a `setPositionMs(estimado)`.
4. El intervalo se limpia en el cleanup del efecto.

Esto hace que la barra avance a ~500 ms de precisión sin depender de los eventos del SDK. Cuando el SDK emite un evento real, `setPositionMs(position)` lo sincroniza.

### Fix de desmontaje (dependiente)
Aplicar fix 031 antes o junto a este. Sin él, la posición se sigue reseteando a 0 al remontar.

## Notes
- El intervalo debe detenerse mientras `pausedRef.current === true` para no falsear la posición durante pausas.
- `durationMsRef.current` ya existe y se actualiza en el listener. Usarlo en el intervalo evita un closure stale sobre `durationMs` state.
- No usar `requestAnimationFrame` — la precisión de 500 ms es suficiente y más barata.

## Verify
1. Abrir `/aire?token=...` con sesión DJ activa.
2. Esperar que arranque la primera canción.
3. Observar la barra de progreso durante 10 segundos: debe avanzar de forma continua y suave, sin saltos perceptibles de más de 0.5 s.
4. Los tiempos elapsed y total deben mostrar valores coherentes con la posición real de Spotify.
5. Pausar y reanudar: la barra debe detenerse en pausa y continuar desde la misma posición al reanudar.

## Changelog
- v1 (2026-06-01): diagnóstico inicial
