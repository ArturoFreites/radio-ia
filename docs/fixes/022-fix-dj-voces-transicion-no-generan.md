# Fix: Modo DJ — voces de transición no se generan entre canciones
> Status: DONE
> v1 | 2026-05-26

## Bug
En modo DJ las canciones avanzan automáticamente sin que se reproduzca ninguna voz entre ellas. No suena el locutor anunciando la siguiente pista.

## Root cause

Hay dos rutas de fallo silenciosas en cadena:

### Fallo A — generación en el worker
`src/lib/spotify/generarPresentacion.ts:43` — `getAccessTokenFresco(presentacion.sesion.conexion)` falla si la `conexion` tiene el refresh token expirado o null. El bloque `catch` actualiza el estado a `ERROR` y publica `PRESENTACION_ERROR` por SSE, pero no hay reintento.

### Fallo B — estado ERROR no manejado en el POST de pedirPresentacion
`src/components/spotify/SpotifyPanel.tsx:295-310` — `pedirPresentacion` solo maneja respuesta `{estado: "LISTA"}`. Cuando el worker ya marcó la presentación como `ERROR`, la ruta devuelve `{estado: "ERROR"}` y la función retorna sin hacer nada: ni marca la pista como fallida (`presentacionFallidaTrackIdRef`) ni llama a `desbloquearEsperaPresentacion`. Esto deja `esperandoPresentacionRef.current = true` hasta que vence el timeout de seguridad, lo que pausa Spotify varios segundos innecesariamente.

### Fallo C — sin retry cuando el POST a /presentacion devuelve GENERANDO y el SSE pierde el evento
`src/components/spotify/SpotifyPanel.tsx:554-590` — el `EventSource` no tiene polling de respaldo. Si la conexión SSE cae y se reconecta justo durante la ventana en que el worker publicó `PRESENTACION_LISTA`, el evento se pierde y el frontend espera hasta timeout.

## Fix

### Fix A — manejar respuesta ERROR en pedirPresentacion
`src/components/spotify/SpotifyPanel.tsx` — en `pedirPresentacion`, añadir un branch para `data.estado === "ERROR"`: llamar a `desbloquearEsperaPresentacion(track.id)` para que Spotify continúe sin voz en lugar de esperar el timeout.

### Fix B — polling de fallback cuando SSE pierde un evento
`src/components/spotify/SpotifyPanel.tsx` — cuando `esperandoPresentacionRef.current === true` y han pasado más de 3 s sin respuesta SSE, hacer un GET a `/api/spotify/sesion/[id]/presentacion?trackId=[id]&token=[token]` para consultar el estado. Si devuelve `LISTA` con `audioUrl`, activar la transición. Si devuelve `ERROR`, llamar a `desbloquearEsperaPresentacion`.

`src/app/api/spotify/sesion/[id]/presentacion/route.ts` — añadir handler `GET` que acepte `trackSpotifyId` como query param y devuelva el estado actual de la presentación.

### Fix C — reintento de generación cuando la presentación está en ERROR
`src/app/api/spotify/sesion/[id]/presentacion/route.ts` — cuando `presentacion.estado === "ERROR"`, re-encolar el job de generación (cambiar estado a `PENDIENTE` y añadir a la queue) en lugar de devolver el estado de error directamente. Añadir un contador `retries` (máx 2) para evitar loops infinitos.

## Verify
1. Iniciar modo DJ con Spotify reproduciendo.
2. Dejar reproducir hasta los últimos 15 s de una canción sin interacción.
3. La reproducción debe pausarse, sonar una voz anunciando la siguiente pista, y luego continuar con la siguiente canción.
4. Si el worker está caído: Spotify debe auto-continuar en menos de 8 s (timeout de seguridad), sin quedarse indefinidamente pausado.

## Changelog
- v1 (2026-05-26): diagnóstico inicial — tres rutas de fallo silencioso en la cadena de generación de voces DJ
