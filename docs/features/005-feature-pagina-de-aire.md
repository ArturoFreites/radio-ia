# Feature: Página de Aire — transmisión autónoma en vivo
> Status: DONE
> v1 | 2026-05-13

## Why
La radio necesita una única página siempre abierta en el navegador que gestione el audio en vivo de forma autónoma: ejecuta programas según la grilla, cae al Modo DJ cuando no hay programa, y deja que OBS la capture para distribuir a cualquier plataforma.

## Files

### Create
- `src/app/aire/page.tsx` — página de transmisión (sin login, con token de radio)
- `src/app/aire/layout.tsx` — layout minimalista (sin sidebar, sin header, fullscreen)
- `src/app/api/aire/estado/route.ts` — ver spec `feature-grilla-programacion.md`
- `src/components/aire/AireController.tsx` — componente cliente principal, gestiona modo y audio
- `src/components/aire/RelojClock.tsx` — reloj digital HH:MM:SS actualizado cada segundo
- `src/components/aire/ModoPrograma.tsx` — UI + lógica de reproducción de bloques
- `src/components/aire/ModoDJ.tsx` — re-exporta `SpotifyPanel` adaptado al contexto de aire
- `src/components/aire/GrillaHoy.tsx` — lista de slots del día con estado (visual lateral)
- `src/components/aire/ControlsBar.tsx` — botones de intervención del operador
- `src/app/api/aire/token/route.ts` — `GET` valida token de radio y devuelve radioId (sin NextAuth)

### Modify
- `src/components/spotify/SpotifyPanel.tsx` — aceptar prop `modo: 'standalone' | 'aire'` para ajustar controles
- `src/app/(dashboard)/configuracion/page.tsx` — mostrar URL + token de la Página de Aire

## Contracts

```typescript
// El token de aire es distinto del panelToken de programa
// Se genera en Radio y se expone en /configuracion
// /aire?token=[aireToken]

// AireController recibe del servidor:
type AireProps = {
  radioId: string
  spotifySesionActiva: { sesionId: string; panelToken: string; playlistId: string; playlistNombre: string } | null
  aireToken: string
}

// Estado interno del AireController
type ModoAire = 'PROGRAMA' | 'DJ' | 'IDLE'

// Respuesta de /api/aire/estado (definida en feature-grilla-programacion)
// AireController la lee cada 30 segundos y al arrancar
```

```prisma
// Agregar a model Radio:
aireToken   String  @unique @default(cuid())
```

## Behavior

**Acceso a la página**
- URL: `/aire?token=[aireToken]`
- El servidor valida el token contra `Radio.aireToken`. Si no coincide → 404.
- No requiere sesión de NextAuth. Es pública con token.
- La página es fullscreen, fondo negro, sin sidebar ni header del dashboard.

**Arranque del AireController**
- Al montar: llama a `GET /api/aire/estado` para saber qué debería estar sonando ahora
- Si hay slot activo de tipo PROGRAMA y el programa está LISTO → arranca `ModoPrograma`
- Si hay slot activo de tipo DJ o no hay slot activo → arranca `ModoDJ` (si hay sesión Spotify activa) o muestra `IDLE`
- Si hay slot de tipo PROGRAMA pero estado ≠ LISTO → muestra aviso "Programa no listo" y cae a `ModoDJ`

**Gestión autónoma del tiempo**
- El AireController tiene un intervalo interno de 30 segundos que re-consulta `/api/aire/estado`
- Cuando `segundosHastaFin` llega a 0 (o se detecta que cambió el slot activo):
  - Si el modo actual es PROGRAMA y el siguiente es DJ → fade out audio del programa → inicia ModoDJ
  - Si el modo actual es DJ y el siguiente es PROGRAMA → pausa Spotify suavemente → inicia ModoPrograma
  - Si el modo actual es DJ y no hay siguiente → el DJ continúa indefinidamente
- El cambio de modo nunca corta el audio abruptamente: siempre hay fade de 2-3 segundos

**ModoPrograma**
- Recibe la lista de bloques del programa (con sus `audioUrl`)
- Reproduce los bloques en orden usando `HTMLAudioElement`
- Al terminar cada bloque avanza automáticamente al siguiente
- Si un bloque no tiene audio → lo salta y muestra aviso
- Al terminar el último bloque → notifica a `AireController` que el programa terminó
- Muestra: título del bloque actual, progreso, bloque siguiente en la lista

**ModoDJ**
- Es el `SpotifyPanel` existente adaptado
- Funciona igual que hoy: Spotify SDK + presentaciones IA entre canciones
- Recibe el `sesionId` y `panelToken` de la sesión Spotify activa de la radio
- Si no hay sesión Spotify activa → `AireController` muestra pantalla IDLE con aviso

**IDLE**
- Pantalla negra con el nombre de la radio, el reloj, y "Sin programación activa"
- Aparece solo si no hay slot activo ni sesión Spotify configurada

**ControlsBar — intervenciones del operador**
- `[Siguiente bloque]` — en ModoPrograma, salta al siguiente bloque de audio
- `[Insertar publicidad]` — abre un modal para elegir una cuña de la radio, la inserta como próximo audio y vuelve al programa
- `[Cambiar a DJ]` — fuerza el cambio a ModoDJ (aunque haya un programa activo)
- `[Cambiar a Programa]` — si hay programa listo en el slot actual, vuelve a ModoPrograma
- Los controles son pequeños, en la parte inferior, no distractivos visualmente

**GrillaHoy (panel lateral)**
- Lista de slots del día ordenados por hora
- Cada slot muestra: hora, nombre del programa o "Modo DJ", estado (LISTO / GENERANDO / NO LISTO / activo ahora)
- Se actualiza junto con la re-consulta de estado cada 30 segundos

**Visual general**
- Fondo negro puro (#000000) para OBS chroma o captura directa
- Centro: lo que está sonando (cover art en DJ, título del bloque en Programa)
- Arriba izquierda: reloj HH:MM:SS
- Arriba derecha: indicador "EN VIVO" parpadeante en rojo
- Abajo: barra de progreso + "Siguiente:" con el próximo bloque o canción
- Panel lateral derecho (colapsable): GrillaHoy
- ControlsBar abajo del todo, semi-transparente

## Notes

- `aireToken` vive en el modelo `Radio`, no en `Programa`. Es uno por radio, no por programa.
- El fade entre modos usa `audio.volume` con ramp manual (igual que en `SpotifyPanel.fadeVolume`). No duplicar la función — moverla a `src/lib/audio/fade.ts`.
- El AireController no usa `window.location.reload()` nunca. Los cambios de modo son transiciones de estado React.
- En ModoPrograma, los `audioUrl` de los bloques son rutas locales (`/api/audio/stream/[programaId]`). Necesitan el token del programa, no el aireToken. Incluir el `panelToken` del programa en la respuesta de `/api/aire/estado`.
- La sesión Spotify que usa el ModoDJ es la sesión activa de la radio (la más reciente con `estado: ACTIVA`). El AireController la obtiene en el server component al cargar la página.
- Si hay múltiples slots PROGRAMA solapados (bug de operador), ganar el primero en `horaInicio`.
- El endpoint `/api/aire/estado` se puede llamar sin auth usando el `aireToken` como query param.

## AC
- [ ] `/aire?token=[token_invalido]` devuelve 404
- [ ] Con un slot PROGRAMA activo y audio listo, la página arranca reproduciendo el primer bloque automáticamente al cargar
- [ ] Al terminar el último bloque del programa, la página cambia a ModoDJ sin intervención del operador
- [ ] Cuando la hora de un slot de tipo PROGRAMA llega, la página cambia de DJ a Programa automáticamente (dentro de ±30 segundos)
- [ ] Si el programa del slot no está LISTO, aparece aviso visible y la página se queda en DJ
- [ ] El botón "Siguiente bloque" en ModoPrograma salta al siguiente audio sin corte
- [ ] El reloj en pantalla muestra la hora correcta actualizada cada segundo
- [ ] La GrillaHoy muestra todos los slots del día con su estado
- [ ] La página funciona sin login (solo con token en la URL)

## Changelog
- v1 (2026-05-13): spec inicial — visión de radio autónoma con gestión de modos desde el navegador
