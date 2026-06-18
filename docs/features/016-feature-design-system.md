# Feature: Design system — dark radio/broadcast
> Status: DONE
> v1 | 2026-05-25

## Why
El sistema visual actual usa Tailwind genérico sin identidad. La plataforma es una herramienta de broadcast profesional y debe verse así: consola de radio, no CRUD genérico.

## Files

### Modify
- `src/app/globals.css` — definir variables CSS del design system (paleta, tipografía, radios)
- `src/components/dashboard/Sidebar.tsx` — rediseño completo con identidad visual
- `src/app/(dashboard)/layout.tsx` — topbar si se agrega header superior

### Create
- `src/components/ui/Badge.tsx` — badge con variantes: live (rojo pulsante), online (verde), offline (gris), draft, ready
- `src/components/ui/Button.tsx` — botón con variantes: primary, secondary, ghost, danger + tamaños sm/md/lg
- `src/components/ui/Card.tsx` — card contenedor con variante normal y highlight (borde acento)
- `src/components/ui/StatCard.tsx` — tarjeta de métrica con número grande + label + icono opcional
- `src/components/ui/Table.tsx` — tabla con estilos broadcast: filas con hover, bordes sutiles, header bold
- `src/components/ui/SectionHeader.tsx` — encabezado de sección con título + acción opcional alineada a la derecha

## Contracts

```ts
// Badge
type BadgeVariant = "live" | "online" | "offline" | "draft" | "ready" | "warning";
type BadgeProps = { variant: BadgeVariant; label: string; pulse?: boolean };

// Button
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";
type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode; // icono a la izquierda del label
  href?: string;          // si se pasa, renderiza como <Link>
  loading?: boolean;
};

// StatCard
type StatCardProps = {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: boolean; // borde acento rojo/ámbar
};
```

## Behavior

### Paleta de colores
- Fondo base: `#0a0a0a` (más negro que zinc-950)
- Superficie 1: `#111111` (cards, sidebar)
- Superficie 2: `#1a1a1a` (hover states, inputs)
- Borde sutil: `#2a2a2a`
- Acento primario: rojo `#ef4444` — EN VIVO, acciones críticas, estado activo
- Acento secundario: ámbar `#f59e0b` — advertencias, elementos "on air"
- Acento terciario: azul `#3b82f6` — links, acciones secundarias
- Texto primario: `#f5f5f5`
- Texto secundario: `#a3a3a3`

### Tipografía
- Usar `font-mono` (Geist Mono ya disponible) para números, tiempos, contadores — sensación de consola
- `font-sans` para texto corrido
- Títulos de sección en uppercase tracking-wide tamaño sm — estilo broadcast

### Sidebar rediseño
- Fondo `#111111`, borde derecho con acento sutil
- Logo/nombre de radio en la parte superior con indicador de estado (dot verde/rojo)
- Links con icono a la izquierda (Lucide icons), estado activo con borde izquierdo rojo + fondo leve
- Separador visual entre grupos de links (panel, configuración, etc.)
- En la parte inferior: nombre del usuario + botón de logout

### Badge "EN VIVO"
- Fondo rojo semitransparente + texto rojo + borde rojo
- Cuando `pulse=true`: animación CSS `pulse` en el dot indicador (no en todo el badge)

### Button variantes
- `primary`: fondo rojo `#ef4444`, texto blanco, hover más oscuro
- `secondary`: borde `#2a2a2a`, fondo `#1a1a1a`, texto claro
- `ghost`: sin fondo, sin borde, texto claro, hover fondo sutil
- `danger`: igual a primary pero para acciones destructivas — mismo rojo pero con confirmación visual

### Tablas
- Header: `uppercase text-xs tracking-widest text-zinc-500` — estilo broadcast
- Filas: borde inferior `#2a2a2a`, hover `#1a1a1a`
- Primera columna bold, resto regular

### Aplicación progresiva
Los componentes UI se aplican primero al dashboard (feature 015), luego progresivamente al resto de páginas (programas, grilla, anunciantes, analytics).

## Notes

- No usar librerías de componentes externas (shadcn, radix, etc.) — los componentes son propios y Tailwind-only.
- El rojo `#ef4444` es `red-500` en Tailwind — usar la clase directamente o la variable CSS.
- El ámbar `#f59e0b` es `amber-500`.
- La animación pulse del badge usa la clase `animate-pulse` de Tailwind aplicada solo al dot `<span>`.
- `Card.tsx` y `Button.tsx` deben funcionar como server components (sin `"use client"`) — no agregar estado interno.

## AC
- [ ] El sidebar muestra iconos, estado activo con borde rojo, y nombre de usuario al pie
- [ ] Existe Badge con variante "live" que muestra dot pulsante rojo
- [ ] Existe Button con variantes primary (rojo), secondary y ghost
- [ ] Existe StatCard con número grande en font-mono
- [ ] Existe Table con header uppercase y filas con hover oscuro
- [ ] El dashboard (feature 015) usa todos estos componentes ui/
- [ ] No hay imports de shadcn, radix ni otras UI libs externas

## Changelog
- v1 (2026-05-25): spec inicial
