# Fix: Hora inicio — error de formato en input de texto
> Status: DONE
> v1 | 2026-05-26

## Bug
Al intentar guardar un slot con hora `23:45`, el navegador muestra "Haz coincidir el formato solicitado" y bloquea el submit. El input usa `type` no especificado (texto) con `pattern`, pero la validación nativa del browser dispara el error de formato.

## Root cause
`src/components/grilla/SlotForm.tsx:409` — el campo "Hora inicio" usa `<Input>` sin `type="time"`, relying en `pattern="^\\d{1,2}:\\d{2}$"` para validación. El navegador hace coincidir el patrón con comportamiento inconsistente según plataforma/versión.

## Fix
Cambiar el campo a `type="time"` para delegar la validación al browser nativo. Remover el `pattern` y el label `(HH:MM)` del label (queda solo "Hora inicio"). El valor almacenado en estado ya es `HH:MM`, compatible con `value` de `type="time"`.

## Verify
Abrir el modal "Nuevo slot semanal", ingresar hora `23:45` con el time picker, hacer clic en Guardar → el slot se guarda sin error de validación de formato.

## Changelog
- v1 (2026-05-26): spec inicial
