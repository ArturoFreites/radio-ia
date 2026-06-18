# Fix: Mensaje "sin sesión DJ" enlaza incorrectamente a /spotify
> Status: DONE
> v1 | 2026-06-01

## Bug
En el formulario de slot (grilla) y en la página de aire, cuando Spotify está conectado pero no existe sesión DJ en la base de datos, aparece un mensaje: "Spotify conectado pero sin sesión DJ. Creá una en /spotify". El link lleva a la pantalla de Spotify, que es solo para conectar la cuenta OAuth — no para gestionar sesiones.

## Root cause
`src/components/grilla/SlotForm.tsx:228` — `DjTipoCampo` hace un fetch a `/api/spotify/sesion` y si no hay sesiones, muestra un warning con link a `/spotify`.
`src/components/aire/AireController.tsx:357` — mismo mensaje con link a `/spotify` cuando `estado.sinSesionDj` es true.

Ambos mensajes son incorrectos: las sesiones DJ se auto-crean en `resolverSesionDj` cuando el slot entra en vivo. No hace falta crearlas manualmente desde ningún lado.

## Fix
- `SlotForm.tsx` — eliminar el estado `sinSesionDj`, el fetch a `/api/spotify/sesion` y el bloque condicional que muestra el warning. Si Spotify está conectado, mostrar directamente el selector de playlist (o el estado que corresponda).
- `AireController.tsx` — eliminar el bloque condicional que renderiza el mensaje de sesión faltante y el link a `/spotify`. Si `estado.sinSesionDj` ya no aplica, reemplazar por el `mensajeIdle` normal.

## Verify
1. En la grilla, abrir un slot con tipo DJ y Spotify conectado pero sin sesiones en BD → no debe aparecer ningún mensaje de advertencia sobre sesiones, debe mostrarse el selector de playlist.
2. En la página de aire con un slot DJ activo y sin sesión previa → no debe aparecer ningún link a `/spotify`.
3. La pantalla `/spotify` sigue funcionando solo para conectar/desconectar la cuenta OAuth.

## Changelog
- v1 (2026-06-01): initial
