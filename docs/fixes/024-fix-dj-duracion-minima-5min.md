# Fix: Modo DJ — duración mínima de 5 min en la grilla
> Status: DONE
> v1 | 2026-05-26

## Bug
Al crear un slot de tipo DJ en la grilla, el campo de duración no permite ingresar menos de 15 minutos. Para sesiones cortas de DJ (cuñas musicales, transiciones entre programas), 5 minutos debería ser el mínimo aceptable.

## Root cause
`src/components/grilla/SlotForm.tsx:578` — el `<Input>` de duración tiene `min={15} step={15}` sin distinción de tipo de slot. Este mínimo está pensado para programas con bloques de audio, no para el modo DJ que reproduce Spotify de forma continua.

## Fix
`src/components/grilla/SlotForm.tsx` — leer `tipo` del estado del formulario para determinar los atributos del input de duración:
- Cuando `tipo === "DJ"`: `min={5}` y `step={5}`.
- Para el resto de tipos: mantener `min={15}` y `step={15}`.

No hay validación backend que cambiar: el campo `duracionMin` en la API acepta cualquier entero positivo.

## Verify
1. Abrir la grilla → crear slot tipo DJ → el campo duración acepta valores desde 5 min con incrementos de 5 min.
2. Crear slot tipo PROGRAMA → el campo sigue aceptando mínimo 15 min con paso de 15 min.
3. Guardar un slot DJ de 5 min → se guarda correctamente y aparece en la grilla.

## Changelog
- v1 (2026-05-26): min/step del input de duración no distingue tipo de slot
