# Fix: Modo DJ — auto-trigger de voz y transición limpia entre canciones

> Status: DONE
> v1 | 2026-05-26

## Bug
1. Las voces se generan correctamente pero no se reproducen de forma automática: solo se ejecutan cuando el usuario hace clic en "Siguiente" manualmente
2. Al terminar la voz de presentación, se escuchan unos segundos de la pista anterior antes de que arranque la siguiente canción

## Root cause
- `src/components/spotify/SpotifyPanel.tsx:397-411` — El bloqueo del minuto final depende de que el SDK dispare `player_state_changed` exactamente dentro de la ventana `≤ UMBRAL_BLOQUEO_MS` (12 000 ms); si el último evento fue a ~14 s restantes y el siguiente dispara después de que la pista ya cambió, la transición nunca se activa y la canción avanza sola sin voz
- `src/components/spotify/SpotifyPanel.tsx:189-195` — En `runTransicion`, `resume()` y el fade-in de 2 s se ejecutan **antes** de llamar a `nextTrack()`, haciendo que la pista anterior sea audible durante ~2 segundos

## Fix

### Auto-trigger
- Añadir `bloqueoTimeoutRef: React.MutableRefObject<number | null>` al componente
- En cada `player_state_changed`, calcular `msHastaBloqueo = msRestantes - UMBRAL_BLOQUEO_MS`; si `msHastaBloqueo > 0` y el bloqueo aún no está activo (`!pausaBloqueoSolicitadaRef.current && !transicionIniciadaRef.current`), cancelar el timeout anterior y programar un nuevo `setTimeout(dispararBloqueo, msHastaBloqueo)`
- `dispararBloqueo` ejecuta la misma lógica de bloqueo existente: si la presentación ya está lista, llama a `runTransicion()`; si no, pausa y activa `esperandoPresentacionRef`
- Cancelar `bloqueoTimeoutRef` en todos los puntos donde ya se limpian los otros refs (cambio de pista, skip manual, cleanup del efecto)

### Transición limpia
- En `runTransicion`, reordenar el flujo post-voz: `nextTrack()` → esperar 500 ms → `resume()` → `fadeIn(0→0.85, 2000)`
- De esta forma Spotify cambia a la nueva pista mientras el volumen es 0 y el fade-in sube la nueva canción desde el comienzo

## Verify
1. Reproducir una canción hasta los últimos 15 s sin tocar ningún botón — la reproducción debe pausarse automáticamente, reproducir la voz y arrancar la siguiente canción sin intervención del usuario
2. Al terminar la voz, no debe escucharse audio de la pista anterior; la siguiente canción debe empezar en silencio y subir con el fade-in

## Changelog
- v1 (2026-05-26): inicial
