# Fix: Modo DJ — fallback a web player cuando RadioFlow no está activo
> Status: DONE
> v1 | 2026-06-01

## Bug
`SpotifyEscuchaPanel` muestra siempre "Reproducí desde tu app en RadioFlow" y cuando no hay playback activo en el dispositivo solo dice "Sin reproducción activa en RadioFlow". No hay fallback al web player del navegador.

## Root cause
`src/components/spotify/SpotifyEscuchaPanel.tsx:77` — el mensaje de instrucción es estático (siempre visible) y el componente no tiene lógica de fallback: cuando `current === null` solo muestra texto, nunca inicializa el Web Playback SDK.

`src/components/aire/ModoDJ.tsx:17` — `ModoDJ` renderiza directamente `SpotifyEscuchaPanel` sin pasar `playlistId` ni evaluar si hay playback activo.

## Fix

**`SpotifyEscuchaPanel`**
- Añadir prop `playlistId: string`.
- Eliminar el párrafo estático "Reproducí desde tu app de Spotify…" que aparece siempre.
- Añadir estado de carga inicial (`loading`): mientras se hace la primera llamada al endpoint `/reproductor`, no tomar decisiones.
- Cuando la respuesta indica que NO hay playback activo en RadioFlow (`current === null`), renderizar `<SpotifyPanel sesionId panelToken playlistId playlistNombre radioNombre modo="aire" />` en lugar del cuerpo actual del panel.
- Cuando sí hay playback activo (`current !== null`), mostrar el estado actual tal como hoy (cover, progreso, controles), sin el mensaje de instrucción estático.

**`ModoDJ`**
- Pasar `playlistId` a `SpotifyEscuchaPanel`.

## Verify
1. Abrir el panel de Aire con una sesión DJ activa, sin ningún dispositivo Spotify conectado a "RadioFlow".
2. Resultado esperado: el componente inicializa el Web Playback SDK y empieza a reproducir la playlist desde el navegador (sin mostrar "Sin reproducción activa en RadioFlow").
3. Conectar Spotify al dispositivo RadioFlow desde otra app.
4. Resultado esperado: el panel vuelve al modo de "escucha pasiva" (muestra lo que suena en RadioFlow con cover y controles).

## Changelog
- v1 (2026-06-01): spec inicial
