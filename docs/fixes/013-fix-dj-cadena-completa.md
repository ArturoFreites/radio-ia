# Fix: DJ mode no arranca — cadena completa de fallos
> Status: DONE
> v1 | 2026-05-26

## Bug
El slot DJ muestra "Sin programación activa" aunque Spotify esté conectado y el slot esté activo. No suena nada.

## Root causes (en orden de ejecución)

### Fallo 1 — SIN SESIÓN (bloqueador primario)
`src/app/api/aire/estado/route.ts` → `buscarSpotifySesionParaAire(radio.id)` → devuelve `null`.

La tabla `SpotifySesion` está vacía. Sin sesión, `spotifySesion: null` → `spotifyOk = false` → `desiredModo = "IDLE"` aunque el slot sea DJ.

**Por qué no hay sesión:** Feature 009 (DONE) eliminó el aviso en la grilla de que "necesitás crear una sesión primero". El operador configura un slot DJ en la grilla pero no sabe que también tiene que ir a `/spotify` → "Nueva sesión DJ" → elegir playlist + voces.

### Fallo 2 — SIN FEEDBACK en el vivo cuando hay slot DJ pero no hay sesión
`src/components/aire/AireController.tsx` — cuando `modo === "IDLE"` muestra `"Sin programación activa"` sin distinguir si hay un slot DJ activo sin sesión. El operador no sabe qué hacer.

### Fallo 3 — SIN AVISO en la grilla al guardar un slot DJ
`src/components/grilla/SlotForm.tsx` — el componente `DjTipoCampo` verifica si Spotify está conectado pero no verifica si existe alguna sesión. El operador puede guardar un slot DJ sin sesión y no recibe ninguna advertencia de que falta el paso de `/spotify`.

### Fallo 4 — ACTIVACIÓN de audio en primer arranque
`src/components/spotify/SpotifyPanel.tsx` — en el path `primerArranque` (`AireController.tsx:138`), el modo DJ se activa directamente sin pasar por la transición IDLE→DJ. La transición IDLE→DJ es la única que llama `spotifyRef.current?.fadeInResume()`, que a su vez llama `player.activateElement()` para desbloquear el AudioContext del browser.

En primer arranque: `SpotifyPanel` monta → SDK conecta → `ready` dispara → Spotify API inicia reproducción → pero `activateElement()` nunca se llamó. Si el browser bloqueó el AudioContext (tab nuevo sin interacción), el audio no sale aunque el reproductor diga que está tocando.

### Fallo 5 — SPOTIFY PREMIUM requerido (posible, no confirmado)
`src/components/spotify/SpotifyPanel.tsx:251` — el SDK lanza `initialization_error` si la cuenta no tiene Premium. El error se muestra en pantalla pero el vivo sigue mostrando `modo === "DJ"` sin audio (no cae a IDLE).

## Fix

### Fix 1 — Crear sesión (acción de usuario, inmediata)
El operador debe ir a `/spotify` (link en el sidebar) y crear una sesión eligiendo playlist y voces. Sin este paso nada más funciona. Este fix NO es código — es documentar el flujo para el operador.

### Fix 2 — Mostrar aviso específico en el vivo cuando hay slot DJ sin sesión
`src/app/api/aire/estado/route.ts` — añadir campo `sinSesionDj: boolean` al body. Es `true` cuando el slot activo es DJ y `spotifySesion` es null Y existe una `SpotifyConexion` para la radio.

`src/types/grilla.ts` — añadir `sinSesionDj?: boolean` a `EstadoAire`.

`src/components/aire/AireController.tsx` — cuando `modo === "IDLE"` y `estado.sinSesionDj === true`, mostrar en lugar de "Sin programación activa":
```
"Slot DJ activo — falta configurar una sesión en /spotify"
```
Con un link directo a `/spotify`.

### Fix 3 — Verificar sesión existente en SlotForm al guardar tipo DJ
`src/components/grilla/SlotForm.tsx` → `DjTipoCampo` — añadir una segunda verificación: además de comprobar si Spotify está conectado (GET `/api/spotify/playlists`), hacer GET `/api/spotify/sesion` para comprobar si existe al menos una sesión.

Si no existe ninguna sesión pero Spotify está conectado:
```
"Spotify conectado pero sin sesión DJ. Creá una en /spotify para que este slot funcione en el vivo."
```

### Fix 4 — Llamar activateElement() en primer arranque de DJ
`src/components/spotify/SpotifyPanel.tsx` — en el `useEffect` que conecta el player, después de `player.connect()`, llamar `player.activateElement().catch(() => undefined)`. Esto intenta desbloquear el AudioContext tan pronto como el SDK conecta, antes de que llegue el evento `ready`.

Alternativa: en `AireController.tsx` en el path `primerArranque` cuando `target === "DJ"`, añadir un timeout corto y luego llamar `spotifyRef.current?.fadeInResume(0)` (sin fade, solo activa elemento y resume).

### Fix 5 — Mostrar error de Premium como aviso claro sin romper el modo
`src/components/spotify/SpotifyPanel.tsx` — cuando `initError !== null`, en lugar de solo mostrar el error en texto, también emitir un callback hacia `AireController` para que el modo caiga a IDLE con el mensaje. (Mínimo: el error ya se muestra en pantalla, no es urgente.)

## Verify

1. Ir a `/spotify` → crear sesión DJ con una playlist propia de Spotify y la voz "Carlos Noticias".
2. Entrar a `/aire?token=...` cuando el slot DJ está activo.
3. Debe aparecer el nombre de la playlist en la pantalla y empezar a reproducir.
4. Si el audio no sale: hacer clic en cualquier parte de la pantalla (para desbloquear AudioContext) y verificar si `player.activateElement()` fue llamado.
5. Si aparece error de Premium: la cuenta de Spotify necesita Plan Individual o superior.

## Orden de implementación recomendado

1. **Fix 2** (aviso en vivo) — sin código de backend, solo UI
2. **Fix 3** (aviso en grilla) — añadir check de sesión en SlotForm
3. **Fix 4** (activateElement en primer arranque) — una línea en SpotifyPanel
4. Fix 5 (feedback de Premium) — baja prioridad, ya hay error visible

Fix 1 es acción del operador, no código.

## Changelog
- v1 (2026-05-26): diagnóstico completo — 5 fallos en cadena, todos relacionados con la ausencia de SpotifySesion y el gap de UX entre grilla y vivo
