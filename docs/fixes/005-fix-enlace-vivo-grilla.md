# Fix: Enlace directo al vivo desde la Grilla
> Status: DONE
> v2 | 2026-05-13

## Bug
El operador que está en `/grilla` no puede ir al vivo sin pasar primero por `/configuracion` para copiar la URL con el token. No hay acceso directo a la Página de Aire desde la grilla.

## Root cause
`src/app/(dashboard)/grilla/page.tsx` — la página de grilla es un server component pero no consulta `Radio.aireToken` ni renderiza ningún enlace a `/aire`.

## Fix
En `src/app/(dashboard)/grilla/page.tsx`:
1. Leer `radioId` desde la sesión autenticada y consultar `Radio.aireToken` en Prisma.
2. Renderizar un botón/enlace visible en el encabezado de la página que abra `/aire?token=[aireToken]` en una pestaña nueva.
3. Si por alguna razón el token no existe, no renderizar el enlace (no lanzar error).

El enlace debe ser claramente visible pero no distractivo — puede ir junto al título de la página, alineado a la derecha.

## Verify
1. Navegar a `/grilla` como operador autenticado.
2. Debe aparecer un botón "Ir al vivo" (o similar) en el encabezado.
3. Al hacer clic, se abre `/aire?token=[token]` en una nueva pestaña y carga la página de aire correctamente.

## Changelog
- v1 (2026-05-13): spec inicial
- v2 (2026-05-13): implementado — la página `/grilla` ahora consulta `Radio.aireToken` desde la sesión y renderiza un botón "Ir al vivo" en el encabezado alineado a la derecha, que abre `/aire?token=...` en una pestaña nueva. Si el token no existe, el botón no se renderiza.
