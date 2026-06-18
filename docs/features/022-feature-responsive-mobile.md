# Feature: Responsive móvil completo

> Status: DONE
> v1 | 2026-05-26

## Why

El sistema no es usable en móvil: el sidebar del dashboard ocupa toda la pantalla, el vivo/aire tiene un sidebar lateral fijo de 288px que aplasta el contenido, y los layouts no colapsan en breakpoints pequeños.

## Files

### Create

- `src/components/dashboard/MobileTopbar.tsx` — barra superior móvil con botón hamburguesa, nombre de radio e indicador de stream

### Modify

- `src/app/(dashboard)/layout.tsx` — gestionar estado de drawer abierto/cerrado, pasar props a Sidebar y MobileTopbar
- `src/components/dashboard/Sidebar.tsx` — modo drawer en móvil (overlay sobre el contenido) y modo fijo en desktop
- `src/components/aire/AireController.tsx` — en móvil, cambiar GrillaHoy lateral por bottom sheet; ajustar header para pantallas pequeñas
- `src/components/aire/GrillaHoy.tsx` — aceptar prop `modoBottomSheet: boolean`; en ese modo renderizar como panel inferior deslizable
- `src/components/aire/ControlsBar.tsx` — texto informativo truncado en móvil, botones apilados si no caben

## Contracts

```ts
// MobileTopbar
type MobileTopbarProps = {
  radioNombre: string;
  streamOnline: boolean;
  onOpenMenu: () => void;
};

// Sidebar — nuevas props
type SidebarProps = {
  radioNombre: string;
  userNombre: string;
  streamOnline: boolean;
  mobileOpen?: boolean;      // controla visibilidad del drawer en móvil
  onMobileClose?: () => void; // cierra el drawer al hacer click en un link o en el overlay
};

// GrillaHoy — nueva prop
modoBottomSheet?: boolean; // si true, renderiza como panel inferior en lugar de aside lateral
```

## Behavior

### Dashboard (todas las rutas bajo `/(dashboard)`)

- En pantallas `< md`: ocultar el aside del Sidebar; mostrar MobileTopbar fija arriba
- MobileTopbar muestra: botón hamburguesa (izquierda) + nombre de radio + dot de stream (centro) + espacio vacío (derecha)
- Al pulsar hamburguesa: el Sidebar se superpone como drawer desde la izquierda con overlay oscuro detrás
- Al pulsar un link dentro del Sidebar o el overlay oscuro: cerrar el drawer
- En pantallas `≥ md`: Sidebar siempre visible como columna lateral (comportamiento actual); MobileTopbar oculta
- El contenido principal reduce padding a `p-4` en móvil (`p-6` en desktop sigue igual)

### Aire / Vivo

- En pantallas `< md`:
  - El header superior (reloj + badge "En vivo") se comprime en una sola fila más pequeña sin superposición
  - El `GrillaHoy` deja de ser un aside lateral; se convierte en un bottom sheet que aparece desde abajo al pulsar el botón "Grilla"
  - El bottom sheet ocupa el 75 % de la altura de pantalla con scroll interno
  - Al cerrar el bottom sheet, el botón "Grilla" vuelve a aparecer en la esquina inferior derecha
- En pantallas `≥ md`: comportamiento actual (sidebar lateral de `w-72`)
- `ControlsBar`: en móvil la fila de texto informativo muestra solo el temporizador a la izquierda (truncar el texto del slot siguiente); los botones de acción se mantienen en fila con `flex-wrap`

## Notes

- El layout del dashboard es un Server Component; el estado del drawer (open/closed) debe vivir en un Client Component wrapper dentro del layout, no en el layout directamente.
- El Sidebar ya es `"use client"`. Solo necesita recibir `mobileOpen` y `onMobileClose` como props.
- No agregar librerías externas para el drawer ni el bottom sheet; implementar con `fixed inset-0`, `translate-x`, `translate-y` y Tailwind.
- El overlay del drawer del dashboard debe tener `z-40`; el drawer `z-50`. El MobileTopbar `z-30`.
- El bottom sheet del aire debe tener `z-30` para quedar encima del contenido pero debajo del modal de cuña (`z-50`).
- Usar `useMediaQuery` o detección por breakpoint de Tailwind con `window.innerWidth` para saber si estamos en móvil dentro de los componentes cliente que lo necesiten; alternativamente usar clases `md:hidden` / `hidden md:flex` donde sea posible para evitar JS.
- La preferencia es clases Tailwind responsive (`md:hidden`, `hidden md:flex`, `md:translate-x-0`) antes que JS de detección de viewport. Solo usar JS cuando el comportamiento requiere lógica (p.ej. cerrar el drawer al navegar).

## AC

- [ ] En móvil, el dashboard muestra topbar con hamburguesa y el sidebar está oculto por defecto
- [ ] Al pulsar hamburguesa, el sidebar aparece como drawer lateral con overlay; se cierra al pulsar un link o el overlay
- [ ] En desktop (≥ md), el sidebar siempre visible y el topbar no aparece
- [ ] En la página de Vivo en móvil, el clock y el badge "En vivo" no se superponen
- [ ] En la página de Vivo en móvil, pulsar "Grilla" abre un bottom sheet con la programación del día
- [ ] El bottom sheet del Vivo se puede cerrar y el botón "Grilla" vuelve a aparecer
- [ ] En desktop, el Vivo sigue mostrando el aside lateral (comportamiento actual)
- [ ] Todos los módulos del dashboard (grilla, programas, voces, configuración, spotify) son navegables en móvil sin scroll horizontal

## Changelog

- v1 (2026-05-26): inicial
