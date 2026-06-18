# Feature: Pantalla de Aire — rediseño Spotify UI + next track interactivo
> Status: DONE
> v1 | 2026-05-26

## Why
La pantalla de aire usa estilos genéricos que no aplican los tokens Spotify definidos en la feature 017. El "tema siguiente" solo muestra texto plano — sin cover art ni botón para saltar desde la pantalla. Los datos visibles no tienen jerarquía suficiente para una cabina en uso real.

## Files

### Modify
- `src/components/spotify/SpotifyPanel.tsx` — rediseño completo del modo "aire": cover grande, next track con cover + skip, badge de presentación, barra blanca, controles visibles
- `src/components/aire/ModoPrograma.tsx` — aplicar tokens Spotify: barra blanca, label de programa, jerarquía tipográfica, contador de bloques
- `src/components/aire/AireController.tsx` — badge EN VIVO con estilo pill semitransparente, aviso de slot más sutil
- `src/components/aire/ControlsBar.tsx` — radio var(--r-md) en botones, borde más sutil, backdrop-blur reforzado

## Contracts

```ts
// SpotifyPanelHandle — agregar método:
type SpotifyPanelHandle = {
  fadeOutPause: (totalMs?: number) => Promise<void>;
  fadeInResume: (totalMs?: number) => Promise<void>;
  skipToNextTrack: () => Promise<void>; // alias público de onManualSkip
};
```

## Behavior

### SpotifyPanel — modo "aire"

**Zona principal (track actual)**
- Layout desktop: `grid-cols-[minmax(0,280px)_1fr]` — cover izquierda, info derecha. Sin cambio en estructura, solo tokens visuales.
- Cover art actual: `border-radius: var(--r-xl)` (24px), `box-shadow: var(--shadow-hover)` — sombra negra profunda visible.
- Barra de progreso: fill cambia de `bg-amber-500` a `background: #f5f5f5` (blanco Spotify). Fondo `#1e1e1e`. `border-radius: var(--r-full)`. Altura 4px.
- Tiempo: izquierda posición, derecha duración, `text-xs text-zinc-500 tabular-nums`.
- Badge de presentación (cuando `presentacionEstado !== "idle"`): pill pequeño alineado junto a los tiempos — "Generando…" con fondo `rgba(255,255,255,.06)` texto `text-zinc-400`, "Lista ✓" con fondo `rgba(255,255,255,.08)` texto `text-zinc-200`. Font `text-[10px] font-medium`.
- Controles en modo "aire": quitar el `hidden` condicional. Mostrar botón play/pausa y "Siguiente" pero con estilo `ghost` — sin relleno, border sutil `1px solid #2a2a2a`, `border-radius: var(--r-full)`, texto `text-zinc-200`, hover fondo `rgba(255,255,255,.06)`. Tamaño `text-sm px-4 py-1.5`.
- Nombre de playlist: mover de encima del grid a debajo de la barra de progreso, como dato secundario `text-[11px] text-zinc-600 uppercase tracking-widest`.

**Zona siguiente — next track interactivo**
- Posición: justo bajo la info del track actual, dentro del panel derecho del grid.
- Separador: `border-t border-[#1e1e1e] mt-5 pt-4`.
- Label: "A continuación" en `text-[10px] uppercase tracking-widest text-zinc-500`.
- Layout: `flex items-center gap-3`.
- Cover del next track: imagen `48×48px`, `border-radius: var(--r-md)` (14px), `box-shadow: var(--shadow-card)`. Si no hay next track o la imagen falla: placeholder `48×48px bg-zinc-900 rounded-[14px] flex items-center justify-center text-zinc-600 text-lg` con ♪.
- Info: nombre del track `text-sm font-medium text-zinc-200`, artista `text-xs text-zinc-500`, apilados.
- Botón "Saltar": a la derecha del flex, variante `secondary` — `border: 1px solid #2a2a2a`, `border-radius: var(--r-md)`, `text-xs px-3 py-1`, hover `background: #1a1a1a`. Al clickear ejecuta `onManualSkip` (respeta la lógica de presentación: si hay audio listo la reproduce, si no salta directamente).
- Si `nextTrack === null`: zona visible pero con placeholder y botón deshabilitado (`opacity-40 cursor-not-allowed`).

### ModoPrograma

- Label superior: "PROGRAMA EN VIVO" en `text-[10px] uppercase tracking-widest text-zinc-500`, centrado.
- Título del bloque: `text-3xl font-semibold text-white leading-tight`, centrado, `max-w-2xl`. Sin cambio de dato.
- Contador de bloques: debajo del título, `text-xs text-zinc-500` — "Bloque {index+1} de {queue.length}" (contar solo items `kind === "bloque"`, no cuñas). Si solo hay 1 bloque, omitir.
- Barra de progreso: fondo `#1e1e1e`, fill `#f5f5f5` (blanco), `border-radius: var(--r-full)`, altura 4px, `max-w-md w-full`. Igual que SpotifyPanel.
- Sección siguiente: "Siguiente:" en `text-xs text-zinc-500`, título siguiente bloque en `text-sm text-zinc-300`. Sin cover (no hay imágenes en bloques). Separador sutil igual que SpotifyPanel.

### AireController — top bar

- Badge "EN VIVO": reemplazar `<span>` con punto + texto sueltos por un único elemento pill:
  - `inline-flex items-center gap-1.5 px-2.5 py-1`
  - `background: rgba(239,68,68,.12)`, `border: 1px solid rgba(239,68,68,.25)`
  - `border-radius: var(--r-full)`
  - Punto: `h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse`
  - Texto: `text-red-400 text-[11px] font-semibold tracking-widest uppercase`

- Aviso "Programa no listo": reemplazar el borde ámbar sólido actual por:
  - `border-radius: var(--r-md)`
  - `background: rgba(245,158,11,.08)`
  - `border: 1px solid rgba(245,158,11,.18)`
  - Texto sin cambio.

### ControlsBar

- Contenedor: `border-t border-[#111]`, `background: rgba(0,0,0,.65)`, `backdrop-filter: blur(16px)` — más profundidad que el actual.
- Botones "Siguiente bloque" e "Insertar publicidad":
  - `border-radius: var(--r-md)` (14px, antes era `rounded` ~4px)
  - `border: 1px solid #222`
  - `background: #0d0d0d`
  - hover: `background: #1a1a1a`, `border-color: #333`
  - `transition: background var(--t-fast), border-color var(--t-fast)`
  - Texto: `text-zinc-300`, disabled: `opacity-25`

## Notes

- El fill blanco (`#f5f5f5`) es el lenguaje Spotify para barras de progreso. El ámbar queda reservado para el dashboard/editor. Aplicar consistentemente en ModoPrograma y SpotifyPanel modo aire.
- `onManualSkip` ya gestiona el caso de presentación lista (reproduce el audio) vs. skip forzado (salta directamente). El botón "Saltar" en next track llama esa misma función — no duplicar lógica.
- `skipToNextTrack` en el handle es solo para que AireController pueda llamarlo externamente en el futuro; internamente apunta a `onManualSkip`.
- El contador de bloques en ModoPrograma solo se muestra si `queue.filter(i => i.kind === "bloque").length > 1`.
- Los tokens CSS (`var(--r-xl)`, `var(--shadow-hover)`, etc.) ya existen en `globals.css` desde la feature 017. Usarlos via `style={{}}` donde Tailwind no los expone como utilidad.
- No cambiar la lógica de reproducción, fades, ni el ciclo de presentaciones — solo el visual.
- En mobile (menos de `md`), el grid de SpotifyPanel ya colapsa a columna única — el next track queda bajo la info del track, antes del footer. Verificar que no se corte.

## AC
- [ ] La cover del track actual tiene radio 24px y sombra negra profunda visible
- [ ] La barra de progreso en modo aire es blanca (no ámbar) tanto en SpotifyPanel como en ModoPrograma
- [ ] La zona "A continuación" muestra la cover del siguiente tema (48×48, radio 14px) con nombre y artista
- [ ] El botón "Saltar a este tema" aparece junto al next track y ejecuta el skip correctamente
- [ ] El badge "EN VIVO" es un pill con fondo rojo semitransparente y borde rojo, sin texto externo
- [ ] Los botones de ControlsBar tienen radio 14px
- [ ] ModoPrograma muestra "PROGRAMA EN VIVO" como label superior y el contador "Bloque N de M" cuando hay más de un bloque
- [ ] El botón play/pausa y "Siguiente" son visibles en modo "aire" (no están ocultos con `hidden`)

## Changelog
- v1 (2026-05-26): spec inicial
