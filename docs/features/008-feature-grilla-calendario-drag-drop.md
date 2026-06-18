# Feature: Editor de grilla tipo calendario con drag & drop
> Status: DONE
> v1 | 2026-05-13

## Why
El editor de grilla actual muestra los slots como listas de texto agrupadas por día. Con más de 2-3 slots por día es difícil ver solapamientos, juzgar duraciones y reorganizar. El operador necesita una vista de calendario visual donde pueda crear y mover slots arrastrando, igual que en Google Calendar.

## Files

### Create
- `src/components/grilla/CalendarioSemanal.tsx` — vista de calendario semanal con cuadrícula de tiempo
- `src/components/grilla/SlotBloque.tsx` — bloque arrastrable que representa un slot en la cuadrícula
- `src/components/grilla/SlotPopover.tsx` — popover de creación/edición que aparece al hacer clic en un bloque o al soltar un drag de creación

### Modify
- `src/components/grilla/GrillaEditor.tsx` — reemplazar la sección "Plantilla semanal" por `<CalendarioSemanal>`; conservar la sección "Eventos puntuales" como lista debajo del calendario
- `src/components/grilla/SlotForm.tsx` — convertir en formulario interno de `SlotPopover`; ya no se usa como sección standalone en `GrillaEditor`
- `src/app/api/grilla/slots/[id]/route.ts` — agregar `PATCH` para mover/redimensionar slots
- `src/app/api/grilla/eventos/[id]/route.ts` — agregar `PATCH` para mover eventos

## Contracts

```typescript
// PATCH /api/grilla/slots/[id]
type PatchSlotBody = {
  diaDeSemana?: number        // 0-6, para mover a otro día
  horaInicio?: string         // "HH:MM", para mover en el tiempo
  duracionMin?: number        // para redimensionar
  programaId?: string | null
  playlistId?: string | null
  playlistNombre?: string | null
}

// PATCH /api/grilla/eventos/[id]
type PatchEventoBody = {
  fecha?: string              // "YYYY-MM-DD"
  horaInicio?: string
  duracionMin?: number
  programaId?: string | null
  playlistId?: string | null
  playlistNombre?: string | null
}
```

```typescript
// CalendarioSemanal recibe los mismos datos que GrillaEditor ya tiene
type CalendarioSemanalProps = {
  slots: SlotRow[]
  programas: ProgramaOption[]
  onCambio: () => Promise<void>  // callback para recargar después de cualquier mutación
}
```

## Behavior

**Vista de la cuadrícula**
- Cuadrícula con 7 columnas (Lun–Dom) y eje de tiempo vertical a la izquierda (00:00 a 23:59).
- Cada hora ocupa una altura fija (ej. 60px = 1px por minuto). El operador puede hacer scroll vertical si trabaja con horas fuera de la vista inicial.
- La vista inicial hace scroll automático para mostrar el rango 06:00–22:00.
- Cada slot es un bloque coloreado posicionado absolutamente según su `horaInicio` y `duracionMin`:
  - PROGRAMA → color azul/indigo.
  - DJ → color ámbar/naranja.
- El bloque muestra el nombre del programa (o nombre de playlist para DJ, o "DJ" si no tiene playlist) y el rango horario ("08:00–10:00").
- Si dos slots se solapan en el mismo día, se renderizan en columnas internas dentro de la celda del día (igual que Google Calendar).

**Creación con click + drag**
- Al hacer clic y arrastrar sobre una celda vacía: se dibuja un bloque fantasma que muestra el rango de tiempo siendo definido (ej. "09:30–10:30").
- Al soltar el drag de creación, aparece el `SlotPopover` anclado al bloque recién dibujado con los campos `tipo`, `programa`/`playlist` y `anticipación`. `diaDeSemana`, `horaInicio` y `duracionMin` quedan pre-completados con lo dibujado.
- Si el operador cancela el popover, el bloque fantasma desaparece.
- Un click simple sin drag en una celda vacía también abre el popover con la hora del click pre-completada y duración por defecto de 60 min.

**Mover un slot (drag & drop)**
- El operador arrastra un bloque existente a otro día o a otra hora del mismo día.
- Durante el drag se muestra el bloque en su posición original con opacidad reducida y un bloque "fantasma" en la posición destino.
- Al soltar, se llama a `PATCH /api/grilla/slots/[id]` con los nuevos `diaDeSemana` y/o `horaInicio`. La cuadrícula se actualiza optimísticamente y confirma en el servidor.
- Si el servidor devuelve error, la posición vuelve a la original con un toast de error.
- Implementar con `@dnd-kit/core` (ya instalado).

**Redimensionar un slot**
- Cada bloque tiene un "handle" de resize en el borde inferior (icono de líneas horizontales, visible solo en hover).
- Arrastrar el handle hacia abajo o arriba ajusta la `duracionMin` en incrementos de 15 minutos.
- Al soltar, se llama a `PATCH /api/grilla/slots/[id]` con la nueva `duracionMin`.
- Duración mínima: 15 minutos.

**Editar un slot existente**
- Clic en un bloque existente → abre `SlotPopover` con los datos actuales del slot para editarlos.
- El popover tiene un botón "Eliminar" que llama a `DELETE /api/grilla/slots/[id]`.

**Eventos puntuales**
- La sección "Eventos puntuales" permanece como lista debajo del calendario (igual que hoy), pero con el mismo estilo visual de bloque coloreado.
- Añadir: botón "+ Evento puntual" que abre el `SlotPopover` en modo evento con campo de fecha.
- Los eventos de hoy se destacan visualmente en la lista.
- Funcionalidad futura (fuera de scope): mostrar eventos de un día específico superpuestos sobre la cuadrícula semanal.

**Responsividad**
- En pantallas < 768px: mostrar solo el día actual y los dos días siguientes (scroll horizontal con snap), o colapsar a la vista de lista actual. La vista completa de 7 días es para desktop.

## Notes
- `@dnd-kit/core` y `@dnd-kit/sortable` ya están instalados — no agregar otras librerías DnD.
- El posicionamiento de bloques usa `position: absolute` dentro de un contenedor con `position: relative` y altura total = 24h × 60px. No usar CSS Grid para los bloques (solo para las columnas de días).
- La snap de arrastre es a 15 minutos: al mover o crear, los tiempos siempre se redondean al cuarto de hora más cercano.
- `SlotPopover` reusa el mismo formulario que `SlotForm` actual, pero como popover (no como sección en el layout). No duplicar la lógica de carga de programas/playlists.
- La actualización optimista (actualizar UI antes de confirmar servidor) es recomendada para arrastres pero no es bloqueante — si es complejo, confirmar primero en el servidor y luego actualizar.
- Las animaciones de transición de bloques (aparición/desaparición) son las definidas en fix-006.

## AC
- [x] El operador ve la cuadrícula semanal con sus slots posicionados según hora y duración.
- [x] Hacer clic y arrastrar sobre una celda vacía crea un nuevo slot con el tiempo y duración del drag.
- [x] Arrastrar un bloque existente a otro día o hora lo mueve; `PATCH` actualiza el slot en la BD.
- [x] Arrastrar el handle de resize cambia la duración del slot; `PATCH` actualiza en la BD.
- [x] Hacer clic en un bloque abre el popover de edición con los datos actuales.
- [x] Dos slots solapados en el mismo día se muestran en columnas internas, sin superponerse.
- [x] En mobile (< 768px), la vista no rompe el layout (muestra subconjunto de días o lista).

## Changelog
- v1 (2026-05-13): spec inicial — cuadrícula semanal + drag & drop con @dnd-kit/core
