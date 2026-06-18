# Feature: UX de creación de slots en la grilla — descubrimiento y simplicidad
> Status: DONE
> v1 | 2026-05-25

## Why
El único mecanismo de creación de slots es el click-and-drag sobre la cuadrícula, que es invisible para un usuario nuevo. El campo "Anticipación pre-generación" expone un detalle técnico que el operador no debería manejar. Resultado: la grilla parece bloqueada o vacía la primera vez que se usa.

## Files

### Modify
- `src/components/grilla/CalendarioSemanal.tsx` — agregar encabezados de día con botón "+" por columna; agregar hint de texto en el área vacía de cada columna
- `src/components/grilla/SlotForm.tsx` — mover el campo `anticipacionHoras` a una sección colapsable "Opciones avanzadas"; ajustar labels en español claro
- `src/components/grilla/GrillaEditor.tsx` — agregar texto de ayuda contextual sobre la cuadrícula

## Behavior

**Encabezados de día con botón de creación**
- Cada columna del calendario muestra en su cabecera el nombre del día (Lun, Mar… Dom) y un botón `+` pequeño.
- Al hacer clic en `+`, se abre el `SlotPopover` en modo "nuevo-semanal" con `diaDeSemana` pre-seleccionado para ese día y hora de inicio `08:00` por defecto.
- El botón `+` es siempre visible, no depende de hover.

**Hint en columnas vacías**
- Si una columna no tiene ningún slot, muestra dentro del área de tiempo un texto gris muy sutil: "Hacé clic y arrastrá para crear un slot".
- El hint desaparece cuando la columna tiene al menos un slot.

**Campo "Anticipación" en sección avanzada**
- El campo `anticipacionHoras` del `SlotForm` queda colapsado por defecto bajo un accordion "Opciones avanzadas ▸".
- Al expandir, muestra el campo con label "Pre-generar audio (horas antes)" y helper text "Por defecto: 2 horas".
- El valor por defecto sigue siendo `2`; si el operador no abre el accordion, se guarda `2`.

**Labels del formulario más claros**
- "Slot semanal" → "Repetir cada semana"
- "Evento puntual" → "Una sola vez (fecha específica)"
- "Tipo: PROGRAMA" → "Programa (con guion e IA)"
- "Tipo: DJ" → "Modo DJ (Spotify)"

## Notes

- No cambiar el comportamiento de click-and-drag; solo agregar el botón `+` como entrada alternativa.
- El accordion de "Opciones avanzadas" no necesita persistir su estado entre aperturas del popover; siempre inicia colapsado.
- El hint de texto en columna vacía no debe interferir con el click-and-drag (debe tener `pointer-events: none`).

## AC
- [ ] Cada columna del calendario tiene un botón `+` visible que abre el formulario de nuevo slot para ese día.
- [ ] Las columnas sin slots muestran el texto de ayuda sobre cómo crear arrastrando.
- [ ] El campo "Anticipación" no es visible al abrir el formulario por primera vez; aparece al expandir "Opciones avanzadas".
- [ ] Los labels del formulario usan el texto actualizado.
- [ ] Crear un slot desde el botón `+` funciona igual que crearlo con drag.

## Changelog
- v1 (2026-05-25): spec inicial
