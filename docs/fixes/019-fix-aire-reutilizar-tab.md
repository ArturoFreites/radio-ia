# Fix: Ir al aire reutiliza la pestaña existente
> Status: DONE
> v1 | 2026-05-26

## Bug
Al hacer clic en "IR AL AIRE" (VivoBanner) o "Ir al vivo" (GrillaPage), si ya existe una pestaña con `/aire?token=...` abierta, el navegador abre una segunda pestaña desde cero en lugar de enfocar la que ya está activa.

## Root cause
- `src/components/dashboard/VivoBanner.tsx:100` — usa `window.open(..., "_blank", "noopener,noreferrer")`. El nombre `_blank` siempre crea una nueva pestaña.
- `src/app/(dashboard)/grilla/page.tsx:33` — usa `target="_blank"`. Mismo efecto.

## Fix
Reemplazar el target `"_blank"` por un nombre de ventana estático (`"aire_vivo"`) en ambos puntos de entrada:

- En `VivoBanner`: cambiar `window.open(..., "_blank", "noopener,noreferrer")` a `window.open(..., "aire_vivo")`. Eliminar las flags `noopener,noreferrer` — sin ellas el navegador puede reutilizar la pestaña nombrada; como la URL es del mismo origen, no hay riesgo de seguridad.
- En `GrillaPage`: cambiar `target="_blank"` a `target="aire_vivo"` en el componente `<Link>`. Eliminar también `rel="noopener noreferrer"` por la misma razón.

El nombre `"aire_vivo"` es global al navegador: si la pestaña sigue abierta, el navegador la enfoca en vez de crear una nueva.

## Verify
1. Abrir el dashboard y hacer clic en "IR AL AIRE" → se abre `/aire` en una nueva pestaña.
2. Volver al dashboard sin cerrar la pestaña de aire.
3. Hacer clic en "IR AL AIRE" de nuevo → el navegador enfoca la pestaña existente de `/aire`, no abre una segunda.
4. Repetir desde "Ir al vivo" en la página de grilla — mismo comportamiento.

## Changelog
- v1 (2026-05-26): spec inicial
