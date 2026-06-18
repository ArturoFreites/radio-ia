# Fix: Generación masiva de presentaciones al crear sesión Spotify
> Status: DONE
> v1 | 2026-05-13

## Bug
Al crear una sesión Spotify se pre-generan 3 presentaciones de audio inmediatamente, consumiendo tokens de ElevenLabs para tracks que puede que nunca se escuchen (si el operador termina la sesión antes).

## Root cause
`src/app/api/spotify/sesion/route.ts:107-114` — al crear la sesión se encolan los primeros 3 `PresentacionTrack` en BullMQ. El panel ya tiene lógica para solicitar la siguiente presentación cuando quedan < 90 s del track actual, por lo que el pre-calentamiento de 3 es redundante para los tracks 2 y 3.

## Fix

**`src/app/api/spotify/sesion/route.ts`**
Cambiar `take: 3` a `take: 1`: al crear la sesión solo se encola la presentación del primer track (el que va a sonar de inmediato).

El track 2 y siguientes se generarán on-demand por la lógica existente del panel (`POST /api/spotify/sesion/[id]/presentacion` cuando quedan < 90 s).

## Verify
1. Crear una sesión Spotify nueva con una playlist de ≥ 5 tracks
2. Verificar en la DB (`PresentacionTrack`) que solo 1 registro tiene `estado = GENERANDO` o `LISTA` inmediatamente después de crear la sesión
3. Durante la reproducción, cuando queden < 90 s del track 1, se debe encolar automáticamente la presentación del track 2
4. El track 2 debe reproducirse con su presentación sin cortes

## Changelog
- v1 (2026-05-13): reducir pre-generación de 3 a 1 track al crear sesión
