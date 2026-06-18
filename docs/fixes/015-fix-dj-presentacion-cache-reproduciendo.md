# Fix: DJ — presentaciones en caché no se reproducen + estado "reproduciendo" ausente
> Status: DONE
> v1 | 2026-05-26

## Bug

En el modo DJ en vivo, las voces no se reproducen en ninguno de estos dos casos:

1. **Track ya generado previamente** (caché en BD): el API devuelve `{ estado: "LISTA" }` sin `audioUrl`. El cliente llama a `desbloquearEsperaPresentacion`, que marca el track como "fallido" (`presentacionFallidaTrackIdRef`). El bloqueo de transición queda inhibido y la canción avanza sin diálogo.

2. **Track en estado ERROR**: el `upsert` con `update: {}` no resetea el estado. El job nunca se reencola, no llega SSE, el player se pausa 25 s y avanza sin audio.

Además, durante la reproducción del diálogo no hay indicador visual de que el audio está sonando, y el estado de generación aparece desconectado del track siguiente.

## Root cause

`src/app/api/spotify/sesion/[id]/presentacion/route.ts:43` — `upsert` con `update: {}` deja estados no-PENDIENTE sin re-encolarse, y no devuelve `audioUrl` cuando el estado es LISTA.

`src/components/spotify/SpotifyPanel.tsx:168-176` — `pedirPresentacion` ignora `audioUrl` en la respuesta LISTA y delega al path de "fallo" en lugar de al path de "audio listo".

`src/components/spotify/SpotifyPanel.tsx:106` — no existe estado `"reproduciendo"` ni indicador junto al track siguiente.

## Fix

### 1. `presentacion/route.ts` — devolver `audioUrl` cuando está LISTA; resetear ERROR

- Reemplazar el `upsert` por un `findUnique` + `create` condicional.
- Si `estado === LISTA` y existe `audioUrl`, devolver `{ estado: "LISTA", audioUrl }` directamente (sin encolar).
- Si `estado === ERROR`, actualizar a `PENDIENTE` con `errorLog: null` antes de encolar.
- Si `estado === GENERANDO`, devolver `{ estado: "GENERANDO" }` sin encolar de nuevo (ya hay un job corriendo).

### 2. `SpotifyPanel.tsx` — manejar `audioUrl` en respuesta LISTA de `pedirPresentacion`

- Cambiar tipo de respuesta a `{ estado?: string; audioUrl?: string }`.
- Si `estado === "LISTA"` y hay `audioUrl`: setear `audioUrlPresentacionRef.current = audioUrl`, `presentacionListaRef.current = true`, `setPresentacionEstado("lista")`. No llamar a `desbloquearEsperaPresentacion`.
- Si `estado === "LISTA"` pero no hay `audioUrl` (voces no configuradas): comportamiento actual (desbloquear).

### 3. `SpotifyPanel.tsx` — estado `"reproduciendo"` y badge junto al track siguiente

- Añadir estado `dialogoReproduciendo: boolean` (true durante `runTransicion` mientras el audio está sonando).
- Setear a `true` justo antes de `audio.play()` y a `false` al finalizar (resolved o rejected).
- Badge de estado en la sección "A continuación": mostrar junto al nombre del siguiente track, no entre los tiempos de la canción actual. Textos: `"Generando voz…"` / `"Voz lista ✓"` / `"▶ Reproduciendo"`.
- Badge entre tiempos (actual): solo mostrar durante `"generando"` para no saturar; ocultar en `"lista"` y `"reproduciendo"` (ya se ve en el track siguiente).

## Verify

1. Con dos tracks en playlist, reproducir. Parar en el penúltimo segundo. El diálogo se escucha antes de pasar al siguiente tema.
2. Repetir con el mismo track (segunda vuelta de playlist o mismo track ya generado). El diálogo vuelve a escucharse sin regenerar.
3. Forzar un error de ElevenLabs (API key inválida temporal) → esperar que falle → restaurar key → saltar al siguiente track: la presentación se reintenta y se genera.
4. Durante la reproducción del diálogo, verificar que el badge muestra "▶ Reproduciendo" en la sección "A continuación".
5. Al terminar el diálogo, el badge desaparece y la reproducción de Spotify retoma con fade-in.

## Changelog
- v1 (2026-05-26): spec inicial con 3 bugs documentados y mejora UX de estado
