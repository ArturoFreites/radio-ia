# Fix: Transiciones suaves en el editor de grilla
> Status: DONE
> v1 | 2026-05-13

## Bug
En el `GrillaEditor` y `SlotForm` los cambios de estado ocurren de forma abrupta: al agregar un slot aparece instantáneamente en la lista, al eliminarlo desaparece sin animación, y al cambiar el tipo de slot de PROGRAMA a DJ los campos del formulario se intercambian con un salto visual. El resultado es desorientador para el operador.

## Root cause
`src/components/grilla/GrillaEditor.tsx` y `src/components/grilla/SlotForm.tsx` — no existen transiciones CSS ni animaciones en las listas de slots/eventos ni en los campos condicionales del formulario. Los elementos se montan y desmontan del DOM de forma síncrona sin ningún período de transición.

## Fix

### Entrada y salida de tarjetas de slot

Aplicar animación de entrada (fade-in + ligero scale-up desde 0.95) a cada tarjeta `<li>` cuando se agrega al listado. Para la salida (eliminación), aplicar fade-out + scale-down antes de que el elemento se quite del DOM — esto requiere mantener el elemento en estado "saliendo" durante la duración de la animación antes de removerlo del estado React.

La duración de las animaciones debe ser corta: ~150ms entrada, ~120ms salida.

### Campos condicionales en SlotForm

Cuando el campo `tipo` cambia entre PROGRAMA y DJ:
- El campo que aparece (selector de programa o selector de playlist) debe hacer fade-in + desplazamiento vertical suave desde arriba.
- El campo que desaparece debe hacer fade-out hacia abajo antes de desmontarse.
- Duración: ~120ms.

### Lista de eventos puntuales

Mismas animaciones de entrada/salida que las tarjetas de slot semanal.

### Restricciones

- No añadir dependencias. Las animaciones deben implementarse solo con clases CSS de Tailwind (`transition`, `opacity`, `scale`, `duration-*`) o con un `useEffect` de temporización mínima.
- No animar el contenedor padre (el layout no debe saltar cuando entra/sale un hijo).
- Las animaciones no deben bloquear la interacción: el botón "Eliminar" puede pulsarse incluso si hay una animación en curso.

## Verify
1. Crear un slot semanal: aparece con fade-in suave, sin salto.
2. Eliminar un slot: desaparece con fade-out, la lista se compacta suavemente.
3. Cambiar tipo de PROGRAMA a DJ en el formulario: el selector de programa desaparece con fade-out y aparece el selector de playlist con fade-in.
4. Crear y eliminar un evento puntual: mismas animaciones que los slots.

## Changelog
- v1 (2026-05-13): spec inicial
