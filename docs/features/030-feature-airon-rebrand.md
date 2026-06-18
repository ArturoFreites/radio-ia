# Feature: Airon rebrand — identidad visual, login y tokens de color
> Status: DONE
> v1 | 2026-05-26

## Why
La plataforma pasa a llamarse **Airon**. Se incorpora el logo oficial y su paleta de colores como sistema visual base, reemplazando los tokens genéricos actuales. La pantalla de login es la primera vista del producto y debe reflejar la identidad desde el primer contacto.

## Files

### Create
- `public/airon-logo.png` — logo oficial (copiar desde `~/Downloads/airon.png`)

### Modify
- `src/app/globals.css` — agregar tokens Airon: `--airon-blue`, `--airon-navy`; actualizar `--accent-primary` y `--accent-tertiary`
- `src/app/layout.tsx` — metadata: title `"Airon"`, description `"Plataforma de radio con inteligencia artificial"`
- `src/app/login/page.tsx` — rediseño completo con logo, fondo con gradiente sutil, tagline
- `src/components/dashboard/Sidebar.tsx` — logo Airon en header, active state → `--airon-blue`
- `src/components/ui/Button.tsx` — variante `primary` → Airon Blue

## Contracts

```css
/* Variables nuevas en :root */
--airon-blue: #1AABF0;       /* azul eléctrico de señal/marca */
--airon-navy: #1B2744;       /* navy profundo de tipografía logo */
--airon-blue-dim: #1484BB;   /* Airon Blue oscurecido para hover */
--airon-blue-glow: rgba(26, 171, 240, 0.15); /* resplandor sutil para focusy gradientes */

/* Variables que cambian */
--accent-primary: #1AABF0;   /* antes: #ef4444 rojo — el rojo pasa a ser exclusivo semántico de EN VIVO */
--accent-live: #ef4444;      /* nuevo nombre para el rojo, solo para badges LIVE y estado on-air */
```

## Behavior

### Tokens de color
- `--airon-blue` es el color de acción: botones primary, links, active states, focus rings.
- `--airon-navy` se usa como tono de profundidad en fondos con identidad de marca (login background, card de onboarding).
- El rojo `#ef4444` se renombra conceptualmente a `--accent-live` y permanece solo para: badge EN VIVO, dot de stream status.
- El ámbar `#f59e0b` se mantiene sin cambios para advertencias.

### Login page — rediseño
- Fondo: dark (`--background`) con un gradiente radial sutil centrado en `--airon-blue-glow` (no opaco, solo un halo de 600px).
- Card centrada `max-w-sm`, sin sombra dramática — borde sutil `--border-subtle`.
- Dentro de la card:
  1. Logo Airon (`public/airon-logo.png`) centrado, ancho máximo 160px, con `object-contain`.
  2. Tagline bajo el logo: `"Radio con inteligencia artificial"` — `text-xs text-zinc-400 text-center`.
  3. Separador `<hr>` sutil.
  4. Formulario: campo Email, campo Contraseña, botón `"Ingresar"` (variant `primary`, full width).
- Sin texto "Ingreso" como h1 — el logo reemplaza el encabezado.
- El botón de submit usa la variante `primary` que ahora es Airon Blue.

### Sidebar — header con logo
- El bloque superior del sidebar (antes: solo nombre de radio + dot de stream) se reorganiza:
  1. Logo Airon (`public/airon-logo.png`) — ancho 100px, `object-contain`, margin bottom 8px.
  2. Nombre de la radio del cliente (texto `text-sm font-medium text-zinc-100`).
  3. Indicador stream (dot verde/rojo + texto) — igual que ahora.
- Estado activo de nav link: `border-l-[color:var(--airon-blue)]` en vez de `border-l-red-500`.
- El dot de stream ONLINE se mantiene `bg-emerald-500`; OFFLINE se mantiene `bg-red-500` (semántico, no de marca).

### Button — variante primary
- Fondo: `--airon-blue` (`#1AABF0`), hover: `--airon-blue-dim` (`#1484BB`).
- Texto: `#0a0a0a` (casi negro — el azul claro necesita texto oscuro para contraste WCAG AA).
- Eliminado: el rojo `#ef4444` como color de primary button.

### Metadata
- `<title>Airon</title>` en layout.tsx.
- Description: `"Plataforma de radio con inteligencia artificial"`.

## Notes
- El botón `danger` no cambia — sigue siendo rojo, es una acción destructiva no una variante de marca.
- El badge `live` con dot pulsante rojo no cambia — el rojo ahí es semántico correcto para broadcast.
- El texto sobre `--airon-blue` debe ser oscuro (≈ `#0f172a` o `text-zinc-900`) — el azul claro sobre fondo claro no pasa contraste con texto blanco.
- El logo PNG tiene fondo transparente (checkerboard en la imagen original) — funciona sobre el dark background del sidebar y login sin ajustes.
- No copiar el logo programáticamente — indicar al operador que lo copie de `~/Downloads/airon.png` a `public/airon-logo.png` antes de que Cursor implemente.

## AC
- [ ] `public/airon-logo.png` existe en el repositorio
- [ ] El login muestra el logo Airon, gradiente sutil azul, sin h1 de texto "Ingreso"
- [ ] El botón "Ingresar" en login es Airon Blue con texto oscuro
- [ ] El sidebar muestra el logo Airon sobre el nombre de la radio del cliente
- [ ] El active state del nav link usa azul `--airon-blue` en vez de rojo
- [ ] `<title>` del browser es "Airon"
- [ ] `globals.css` tiene `--airon-blue`, `--airon-navy`, `--airon-blue-dim`, `--airon-blue-glow`
- [ ] El badge EN VIVO y el dot de stream siguen siendo rojos (semántico intacto)
- [ ] `Button` variante `primary` es Airon Blue con texto oscuro

## Changelog
- v1 (2026-05-26): spec inicial
