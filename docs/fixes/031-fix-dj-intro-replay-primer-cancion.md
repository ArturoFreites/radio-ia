# Fix: DJ intro se repite al arrancar la primera canción
> Status: DONE
> v1 | 2026-06-01

## Bug
Al abrir el modo aire en DJ, la intro se reproduce, luego arranca la primera canción, y segundos después la pantalla se resetea y vuelve a mostrar la intro de apertura antes de continuar la música.

## Root cause
`src/components/spotify/SpotifyEscuchaPanel.tsx:86-98` — renderiza `<SpotifyPanel modo="aire" />` solo cuando `current === null` (dato de la REST API, polled cada 5 s). En cuanto Spotify empieza a reproducir, `current` deja de ser null, el componente cambia a la vista de lectura y `SpotifyPanel` se **desmonta**. El cleanup de `SpotifyPanel` desconecta el SDK player (`playerRef.current?.disconnect()`). En la siguiente vuelta del poll, si el estado regresa a null (transición de estado, race condition o nueva sesión), `SpotifyPanel` vuelve a montarse con todos los refs a sus valores iniciales (`introAperturaIniciadaRef = false`), lo que dispara de nuevo `ejecutarIntroApertura()` desde el listener `ready`.

## Fix

### Eliminar la lógica condicional de SpotifyEscuchaPanel en modo aire
`ModoDJ` renderiza `SpotifyEscuchaPanel`, que a su vez decide si mostrar SDK o vista REST. En modo aire no tiene sentido esta alternancia: el SDK debe mantenerse montado para toda la sesión.

- `src/components/aire/ModoDJ.tsx`: reemplazar `<SpotifyEscuchaPanel>` por `<SpotifyPanel modo="aire">` directamente. `SpotifyEscuchaPanel` queda solo para el panel de dashboard (fuera del aire).
- `src/components/spotify/SpotifyEscuchaPanel.tsx`: la lógica de "si nothing playing → mostrar SDK" es correcta para el dashboard, no tocarla. Solo dejar de usarla desde `ModoDJ`.

### Estabilidad del ciclo de vida
Una vez que `SpotifyPanel` está montado en modo aire, no debe desmontarse hasta que el usuario cierre la pestaña o cambie a otro modo. `AireController` ya garantiza esto: `ModoDJ` solo renderiza cuando `modo === "DJ" && sesionActiva`.

## Verify
1. Abrir `/aire?token=...` con sesión DJ activa.
2. Esperar que termine la intro de apertura.
3. Verificar que la primera canción empieza a sonar sin que la pantalla se resetee.
4. Dejar pasar más de 10 segundos (dos polls del intervalo de 5 s) y confirmar que el overlay de intro no vuelve a aparecer.
5. Confirmar que la barra de progreso y el tiempo de duración continúan avanzando sin reiniciarse.

## Changelog
- v1 (2026-06-01): diagnóstico inicial
