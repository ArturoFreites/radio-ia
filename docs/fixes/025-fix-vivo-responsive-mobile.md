# Fix: Modo en vivo — responsive para mobile
> Status: DONE
> v1 | 2026-05-26

## Bug
En pantallas de teléfono, el modo en vivo (`/aire`) pierde botones e información crítica. El panel de control inferior es difícil de usar con el dedo, la información de "slot termina en" y "siguiente" desaparece, y el botón "Grilla" es un texto pequeño posicionado absolutamente que pasa desapercibido.

## Root cause

Tres problemas independientes en dos componentes:

### Problema 1 — info de slot oculta en mobile
`src/components/aire/ControlsBar.tsx:85,89,91` — los textos de bloque actual y slot siguiente llevan `hidden md:inline`, por lo que en mobile no se muestra ninguna info sobre la programación. Solo queda el contador de fin de slot (`izquierda`) pero el texto "siguiente:" desaparece.

### Problema 2 — botones de cabina sin touch targets adecuados
`src/components/aire/ControlsBar.tsx:95-126` — los botones "Siguiente bloque" y "Demo publicidad" tienen `padding: 6px 12px` (demasiado pequeño para touch) y no hay separación visual clara entre ellos. En mobile, los botones se apilan (por `flex-wrap`) sin indicar cuál es cuál.

### Problema 3 — botón "Grilla" no visible / no intuitivo
`src/components/aire/AireController.tsx:400-408` — el botón "Grilla" es texto plano posicionado absolutamente en `bottom-20 right-2`, tapado potencialmente por el ControlsBar en mobile, y sin icono ni indicación de que abre un panel lateral.

## Fix

### Fix 1 — mostrar info esencial siempre en mobile
`src/components/aire/ControlsBar.tsx` — eliminar `hidden md:inline` del texto "Siguiente: …". Truncar con `max-w-[50vw] truncate` en mobile para que no desborde. El bloque actual (`bloqueActual`) puede seguir oculto en mobile ya que es info secundaria.

### Fix 2 — touch targets mínimos 44px para botones
`src/components/aire/ControlsBar.tsx` — para los dos botones de la fila inferior:
- `minHeight: 44` en todos los tamaños (reemplazar el `minHeight: 48` solo en "Demo publicidad" por 44 en ambos)
- `padding: "10px 16px"` en mobile, mantener `6px 12px` en `md:`
- Añadir etiquetas cortas con iconos inline o emojis si el espacio lo requiere (solo en mobile, vía `md:hidden`)

### Fix 3 — reemplazar botón "Grilla" por icono de menú hamburguesa con label
`src/components/aire/AireController.tsx` — reemplazar el `<button>Grilla</button>` por un botón más visible:
- Icono hamburguesa (tres líneas SVG inline) + texto "Grilla" en `sm:inline hidden`
- Posición `bottom-20 right-3` con `z-30`, borde redondeado, background `rgba(0,0,0,.8)`, padding 10px
- Touch target mínimo 44×44 px

### Fix 4 — mejorar el header mobile
`src/components/aire/AireController.tsx:318-321` — el header mobile muestra solo el reloj y el badge EN VIVO. Añadir el nombre del slot activo truncado (`estado?.ahora` tipo/nombre) en el centro del header para que el operador sepa qué está al aire sin abrir el panel de grilla.

## Notes
- El bottom sheet de `GrillaHoy` con `modoBottomSheet` ya existe — solo hay que mejorar el trigger.
- No tocar el layout de desktop (todo bajo `md:` queda igual).
- Los botones de "Siguiente bloque" y "Demo publicidad" son de cabina, no de urgencia. No es necesario un menú hamburguesa para ellos — mejorar su touch target es suficiente.

## AC
- [x] En mobile, el texto "Siguiente: [nombre]" es visible en la barra inferior sin hacer scroll
- [x] Los botones "Siguiente bloque" y "Demo publicidad" tienen touch target ≥ 44px de alto
- [x] El botón para abrir la grilla es visible y recognoscible en mobile (icono hamburguesa o equivalente)
- [x] El header mobile muestra el nombre/tipo del slot activo
- [x] El layout de desktop (≥ 768px) no cambia

## Changelog
- v1 (2026-05-26): tres problemas de responsive: info oculta, touch targets pequeños, botón de grilla no visible
