# Feature: Grilla UX — indicadores de tiempo, slots legibles y eventos mejorados
> Status: DONE
> v1 | 2026-05-25

## Why
La grilla existe para diagramar qué se emite y cuándo. Hoy los bloques son ilegibles (texto 10px), no hay ancla temporal (no sabés dónde estás en el día), y los eventos puntuales son una lista plana sin contexto visual.

## Files

### Modify
- `src/components/grilla/SlotBloque.tsx` — más info visible en cada bloque, tipografía más grande
- `src/components/grilla/CalendarioSemanal.tsx` — columna HOY destacada + línea de hora actual + scroll a hora actual reforzado
- `src/components/grilla/GrillaEditor.tsx` — reemplazar lista plana de eventos por tarjetas visuales mejoradas

### Create
- `src/components/grilla/LineaHoraActual.tsx` — línea roja que marca la hora exacta dentro del día, actualiza cada minuto

## Contracts

```ts
// LineaHoraActual
type LineaHoraActualProps = {
  visible: boolean; // true solo si es el día de hoy
};
// Renderiza un div absoluto posicionado con top calculado desde Date.now() dentro del track del día
```

## Behavior

### SlotBloque — más información

El bloque muestra tres líneas (cuando la altura lo permite):
1. Nombre del programa o "DJ" — `text-[11px] font-semibold truncate`
2. Rango horario `08:00–09:00` — `text-[10px] font-mono opacity-80`
3. Tipo: badge pill tiny "PROGRAMA" o "DJ" — solo si la altura del bloque es ≥ 52px (≥ 52min)

El texto en la línea 1 sube de `text-[10px]` a `text-[11px]` y `font-semibold`.
El rango horario ya existe en `font-mono text-[9px]` → subir a `text-[10px]`.
El badge de tipo es nuevo: `text-[9px] font-medium uppercase tracking-wide rounded-full px-1.5 py-0` — blanco con 40% opacidad sobre el fondo del bloque.

El resize handle en el fondo ya existe y se mantiene.

Colores de los slots:
- PROGRAMA: mantener azul/indigo actual. Opacidad de fondo subir a `/95` para mejor legibilidad del texto.
- DJ: mantener ámbar actual. Ídem opacidad.

### CalendarioSemanal — columna HOY

La columna del día actual (comparar `diaDeSemana` con el weekday de hoy en Argentina):
- Header del día: fondo `#1a1a1a`, texto blanco `font-semibold`, borde inferior `2px solid rgba(239,68,68,.5)` (rojo sutil)
- Track del día: fondo `rgba(255,255,255,.015)` — imperceptible pero distinto al resto

No cambiar la lógica de días — solo aplicar estilos condicionales.

### LineaHoraActual — línea roja

Componente client (`"use client"`) que:
- Calcula la posición vertical: `(horaActual * 60 + minutosActuales) * PX_PER_MIN`
- Usa `setInterval` de 60 000ms para actualizarse cada minuto
- Renderiza: `position: absolute`, `left: 0`, `right: 0`, `height: 2px`, `background: #ef4444`, `z-index: 20`, más un círculo de 8px en el extremo izquierdo (dot indicador)
- Solo se muestra cuando `visible=true` (solo en la columna del día actual)

Integración en `CalendarioSemanal`: dentro del `DroppableDayTrack` del día de hoy, renderizar `<LineaHoraActual visible />`. En los demás días, no renderizar el componente.

### Scroll a hora actual

Hoy el scroll va a `6 * 60 * PX_PER_MIN`. Cambiar a: calcular la hora actual en Argentina y hacer scroll a `max(0, (horaActual * 60 - 60) * PX_PER_MIN)` — deja 1 hora de margen arriba. El cálculo usa `getPartesArgentina` ya disponible en el proyecto. Ejecutar en `useLayoutEffect` al montar, y solo si el componente está en cliente.

### GrillaEditor — panel de eventos puntuales mejorado

Reemplazar la lista plana de `EventoCard` con un grid de tarjetas visuales:

**Diseño de cada tarjeta:**
- Usa `Card` (del design system 016/017)
- Layout interno: dos columnas — izquierda (fecha + día de semana) y derecha (hora, duración, programa/tipo)
- Fecha: número del día grande (`text-2xl font-bold font-mono`) + mes abreviado debajo + día de semana (`text-xs text-zinc-500`)
- Separador vertical sutil `|`
- Derecha: hora de inicio (`font-mono font-semibold`) + duración en minutos (`text-xs text-zinc-500`) + nombre del programa o "Modo DJ" + badge de tipo (PROGRAMA/DJ)
- Badge HOY: si el evento es hoy, pill `text-[10px] bg-red-500/15 text-red-400` en la esquina superior derecha
- Acciones al hover: botón "Editar" (ghost) + botón "Eliminar" (danger) que ya existen, ahora con estilos del design system
- Animación de entrada/salida ya existe (`scale-95 opacity-0` → `scale-100 opacity-100`) — mantener

**Layout del panel:**
- Grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` con `gap-3`
- Si no hay eventos: card vacío con ilustración mínima (icono calendario de Lucide + texto "No hay eventos puntuales")

**Botón "Nuevo evento puntual":**
- Mover desde el pie del calendario hacia arriba, junto al título "Eventos puntuales"
- `SectionHeader` con título + botón `Button variant="secondary" size="sm"` con icono `Plus` de Lucide

## Notes

- `PX_PER_MIN` ya está definido en `src/lib/grilla/calendarioSlots.ts` — importar desde ahí en `LineaHoraActual`.
- `getPartesArgentina` ya existe en `src/lib/grilla/tiempo.ts` — usarlo para detectar el día de hoy y la hora actual.
- La columna HOY se detecta comparando `dia.valor` (0=Dom, 1=Lun, ... 6=Sáb) con `getPartesArgentina(new Date()).weekday0Sun`. Esto ya está disponible, ver `GrillaEditor.tsx:155`.
- `LineaHoraActual` tiene que ser "use client" porque usa `setInterval`. El resto del calendario puede seguir siendo server-compatible.
- No cambiar la lógica de drag, resize ni el `SlotPopover` — solo estilos y composición visual.
- El grid de tarjetas de eventos pasa de `<ul>` con `EventoCard` en lista a un `<div className="grid ...">` — la lógica de eliminar y editar (`onEliminar`, `onEditar`) se mantiene igual.
- Los eventos futuros vs. pasados: no filtrar — mostrar todos, pero los pasados con opacidad reducida (`opacity-50`) para distinguirlos visualmente.

## AC
- [ ] Los bloques del calendario muestran nombre en `text-[11px] font-semibold`, rango horario en `text-[10px] font-mono`, y badge de tipo si el bloque tiene ≥ 52px de alto
- [ ] La columna del día actual tiene header con texto blanco + borde rojo sutil y track con fondo levemente distinto
- [ ] Existe `LineaHoraActual` con línea roja de 2px + dot en el extremo izquierdo, visible solo en la columna de hoy
- [ ] La línea de hora actual se actualiza cada minuto
- [ ] Al cargar la grilla, el scroll va a la hora actual menos 1 hora (no hardcodeado a las 6am)
- [ ] Los eventos puntuales se muestran como tarjetas en grid de 1-3 columnas con fecha grande, hora, nombre de programa y badge HOY si aplica
- [ ] Los eventos pasados tienen opacidad reducida
- [ ] El botón "+ Nuevo evento puntual" está junto al título de la sección, no al pie del calendario
- [ ] La sección vacía de eventos muestra icono + texto en lugar de nada

## Changelog
- v1 (2026-05-25): spec inicial
