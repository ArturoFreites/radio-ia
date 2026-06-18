# Fix: Al borrar la grilla y crear un nuevo slot DJ, reproduce la sesión anterior
> Status: DONE
> v1 | 2026-06-01

## Bug
Al estar en vivo con un slot PROGRAMA (o DJ), el usuario borra la grilla actual y crea un nuevo slot en modo DJ. Al volver a /aire, reproduce la intro anterior y la misma programación de la sesión previa, como si no hubiese empezado nada nuevo.

## Root cause

Dos causas encadenadas:

**1. `resolverSesionDj` reutiliza siempre la misma `SpotifySesion`.**
`src/lib/spotify/sesionAire.ts` — `resolverSesionDj` busca la sesión más reciente del radio y la devuelve sin crear una nueva, incluso cuando el slot DJ que la disparó ya no existe y se creó uno nuevo. El `sesionId` nunca cambia entre activaciones de distintos slots DJ.

**2. El cache de intro colisiona entre activaciones.**
`src/lib/spotify/generarIntroApertura.ts` — el archivo de cache se identifica por `intro-{sesionId}-{playlistId[:8]}.mp3` con TTL de 30 min. Como `sesionId` y `playlistId` coinciden con la sesión anterior (mismo radio, misma playlist), se devuelve la intro cacheada de la sesión previa y nunca se genera una nueva.

**3. (Secundario) `introAperturaIniciadaRef` no se resetea al re-ejecutar el efecto principal.**
`src/components/spotify/SpotifyPanel.tsx` — cuando el efecto principal de `SpotifyPanel` se vuelve a ejecutar (por cambio de `playlistId`), el ref `introAperturaIniciadaRef` sigue en `true` del player anterior. El nuevo player dispara `ready` pero el handler sale inmediatamente, sin arrancar la playlist ni ejecutar la intro.

## Fix

### Backend — `src/lib/spotify/sesionAire.ts`

`resolverSesionDj` debe recibir un `slotReferenceId` (el ID calculado del slot activo, e.g. `"slot_xxx"` o `"evt_xxx"`). Usar Redis para persistir `{ slotId, sesionId }` como estado del slot DJ activo para cada radio (`dj:slot:{radioId}`).

Comportamiento:
- Si Redis ya tiene ese `slotId` mapeado a una sesión → devolver esa sesión (poll repetido del mismo slot, sin crear nada)
- Si el `slotId` cambió (slot nuevo) → finalizar la sesión anterior (`EstadoSesionSpotify.FINALIZADA`), crear una sesión nueva, guardar el nuevo mapeo en Redis

El `slotReferenceId` lo provee `src/app/api/aire/estado/route.ts` desde `activo.id`.

### Backend — `src/app/api/aire/estado/route.ts`

Pasar `activo.id` como `slotReferenceId` a `resolverSesionDj`.

### Frontend — `src/components/spotify/SpotifyPanel.tsx`

- Resetear `introAperturaIniciadaRef.current = false` al inicio del cuerpo del efecto principal (antes de crear el player), para que cada vez que el efecto se re-ejecute (por cambio de `sesionId` o `playlistId`) el nuevo player ejecute la intro.
- Agregar `sesionId` como dependencia del efecto principal, para que un cambio de sesión (nuevo `sesionId` tras crear nueva sesión backend) también reinicialice el player.

## Verify

1. Crear un slot PROGRAMA o DJ activo en la hora actual → ir a /aire → suena intro y música.
2. Ir al editor de grilla → borrar el slot → crear un nuevo slot DJ en la misma hora con la misma playlist.
3. Volver a /aire.
4. **Esperado:** se genera y reproduce una intro **nueva** (diferente al texto anterior, no el archivo cacheado) y Spotify arranca desde el principio con la playlist del nuevo slot.
5. Verificar en logs que se creó una nueva `SpotifySesion` en DB.
6. Esperar 10 s (siguiente poll) → la sesión no cambia (mismo slot activo, Redis devuelve el mismo `sesionId`).

## Changelog
- v1 (2026-06-01): diagnóstico inicial, dos causas encadenadas backend + frontend secundario
