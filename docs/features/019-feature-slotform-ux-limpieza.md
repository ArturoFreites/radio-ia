# Feature: SlotForm — limpieza UX del modal y opciones avanzadas contextuales
> Status: DONE
> v1 | 2026-05-26

## Why
El modal de creación/edición de slots mezcla campos que no aplican según el tipo (PROGRAMA vs DJ), y las "Opciones avanzadas" muestran configuración de audio irrelevante para modo DJ.

## Files

### Modify
- `src/components/grilla/SlotForm.tsx` — ocultar opciones avanzadas en modo DJ, mejorar layout del modal

## Contracts

Sin contratos nuevos. No cambian tipos ni APIs.

## Behavior

### Opciones avanzadas — solo en modo PROGRAMA

- La sección "Opciones avanzadas" (con el campo `anticipacionHoras`) se muestra **únicamente** cuando `tipo === "PROGRAMA"`.
- Cuando `tipo === "DJ"`, la sección entera se oculta — no se necesita pre-generación de audio porque Spotify corre en tiempo real.
- Al cambiar de PROGRAMA a DJ y volver a PROGRAMA, el valor de `anticipacionHoras` se preserva en estado (no reiniciar).

### Modal — mejoras visuales

- El botón "Cerrar" se reemplaza por un icono `X` de Lucide (`XIcon`, tamaño 16px), sin texto, ghost, alineado arriba a la derecha.
- La separación entre secciones usa `space-y-4` en lugar de `space-y-3` para dar más aire.
- El bloque de Opciones avanzadas usa `rounded-md border border-zinc-800` (sin `/80`) para consistencia con el design system.
- El trigger de Opciones avanzadas usa el icono `ChevronRight` / `ChevronDown` de Lucide en lugar de `▸` / `▾` texto unicode.
- El mensaje del modo DJ (`DjTipoCampo`) queda dentro de un `rounded-md bg-zinc-900/60 border border-zinc-800 px-3 py-2` para darle contención visual.

### Campos — validaciones mejoradas

- "Hora inicio": usar `type="time"` (ver fix 011). El label queda "Hora inicio" sin `(HH:MM)`.
- "Duración (min)": el `min={15}` y `step={15}` ya están bien — no cambiar.

## Notes

- `DjTipoCampo` no recibe props — el cambio es solo en su wrapper visual interno.
- La lógica de animación de `ProgramaTipoCampo` (fase in/out) no cambia.
- El icono `X` de Lucide se importa como `import { X } from "lucide-react"` — ya está disponible en el proyecto.
- No tocar la lógica de submit, eliminación ni las funciones `enviar` / `eliminar`.

## AC
- [ ] Con `tipo === "DJ"`, la sección "Opciones avanzadas" no aparece en el DOM
- [ ] Con `tipo === "PROGRAMA"`, la sección "Opciones avanzadas" aparece y funciona igual que antes
- [ ] El modal muestra botón de cierre con icono `X` en lugar de texto "Cerrar"
- [ ] El campo de hora usa `type="time"` y no muestra error de formato al ingresar `23:45`
- [ ] El bloque de info de modo DJ tiene contorno visual propio
- [ ] Los íconos de expand/collapse de Opciones avanzadas son de Lucide, no unicode

## Changelog
- v1 (2026-05-26): spec inicial
