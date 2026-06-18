# Feature: Modo DJ simplificado — solo grilla y solo vivo
> Status: DONE
> v1 | 2026-05-21

## Why
El modo DJ estaba disperso: sidebar, página `/spotify`, botón manual en `/aire`. El operador lo configura una sola vez en la grilla y el vivo lo activa automáticamente — sin más puntos de entrada.

Supersede la UI de `001-feature-spotify-djmode.md`. La infraestructura (Prisma, OAuth, worker) de ese spec sigue vigente.
Complementa `007-feature-dj-playlist-por-slot.md` (grilla + playlist por slot).

## Files

### Modify
- `src/components/dashboard/Sidebar.tsx` — eliminar el link "Modo DJ" a `/spotify`
- `src/components/aire/ControlsBar.tsx` — eliminar prop `onCambiarDJ` y el botón "Cambiar a DJ"
- `src/app/(dashboard)/spotify/page.tsx` — reemplazar por una página mínima de solo conexión OAuth (no gestión de sesiones)
- `src/app/(dashboard)/spotify/sesion/[id]/page.tsx` — eliminar; ya no existe flujo de sesión standalone

### Delete
- `src/app/(dashboard)/spotify/sesion/[id]/page.tsx` — el flujo de sesión standalone desaparece

## Behavior

**Sidebar**
- No aparece ninguna entrada "Modo DJ" ni "Spotify" en el menú de navegación lateral.
- El acceso a conectar Spotify se hace desde Configuración o desde un aviso en el SlotForm (ver `007`).

**ControlsBar (vivo)**
- El botón "Cambiar a DJ" no existe.
- El modo DJ se activa automáticamente en `/aire` cuando el slot activo tiene `tipo === "DJ"`.
- El modo PROGRAMA se activa automáticamente cuando el slot activo tiene `tipo === "PROGRAMA"`.
- No hay switch manual entre modos.

**Página `/spotify`**
- Se mantiene solo como destino del callback OAuth de Spotify (`/api/spotify/callback` redirige aquí).
- Muestra: estado de conexión (conectado / no conectado), botón "Conectar cuenta Spotify" si no está conectado, botón "Desconectar" si está conectado.
- No muestra lista de sesiones ni formulario de creación de sesión.
- No aparece en el sidebar.

**Grilla (SlotForm)**
- Sigue siendo el único lugar donde se configura un slot como DJ y se elige la playlist (spec `007`).
- Si Spotify no está conectado al abrir el selector de playlist, muestra un aviso con enlace a `/spotify` para conectar.

**Vivo (`/aire`)**
- Es el único lugar donde el modo DJ es visible y funcional.
- La transición al modo DJ ocurre cuando el slot actual de la grilla es DJ.
- No se puede activar DJ de forma manual ni desde ninguna otra ruta.

## Notes
- `AireController` ya gestiona el modo según el slot activo (`tipo === "DJ"`). El cambio es solo eliminar el override manual (`userPrefiereDJ`, `onCambiarDJ`).
- `userPrefiereDJ` en `AireController` puede eliminarse si no hay otro consumidor.
- La página `/panel/spotify/[sesionId]` (OBS standalone) puede quedar intacta — es un endpoint técnico que no aparece en la navegación.
- La ruta `/spotify` no necesita aparecer en el sidebar pero sí debe existir como página (callback OAuth la usa).

## AC
- [ ] "Modo DJ" no aparece en ningún punto del sidebar ni del menú de navegación.
- [ ] No existe botón "Cambiar a DJ" en la barra de controles del vivo.
- [ ] Un slot con `tipo === "DJ"` activa el modo DJ en `/aire` al llegar su hora, sin intervención del operador.
- [ ] Un slot con `tipo === "PROGRAMA"` activa el modo Programa en `/aire` al llegar su hora.
- [ ] La página `/spotify` existe pero solo muestra el estado de conexión OAuth, sin gestión de sesiones.
- [ ] Desde `SlotForm` (tipo=DJ, sin Spotify conectado) aparece un aviso con enlace a `/spotify`.

## Changelog
- v1 (2026-05-21): spec inicial — simplificación DJ: solo grilla y solo vivo
