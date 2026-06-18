# Feature: UI tokens Spotify-style — redondeos, sombras, inputs y botones
> Status: DONE
> v2 | 2026-05-25

## Why
El sistema visual tiene todos los síntomas del diseño Bootstrap/genérico: `rounded` de 4px en todo, botones `bg-indigo-600` sin transiciones, inputs planos sin foco, sin sombras, sin profundidad. Spotify establece una estética reconocible con radio generoso, sombras negras profundas, botones pill, y una jerarquía visual clara. Esta feature establece ese sistema de tokens y lo aplica a todos los componentes.

## Files

### Modify
- `src/app/globals.css` — definir el sistema de tokens CSS (radios, sombras, transiciones, colores de foco)
- `src/components/ui/Button.tsx` — reescribir con variantes Spotify (pill, filled, ghost)
- `src/components/ui/Card.tsx` — reescribir con radio xl, sombra y hover con profundidad
- `src/components/ui/Badge.tsx` — pill obligatorio, sin bordes cuadrados
- `src/components/ui/StatCard.tsx` — aplicar tokens de card + tipografía mono
- `src/components/ui/Table.tsx` — filas con hover sutil, sin bordes agresivos

### Create
- `src/components/ui/Input.tsx` — input estilizado reutilizable (text, number, date, password)
- `src/components/ui/Select.tsx` — select con flecha custom y mismo sistema que Input
- `src/components/ui/Textarea.tsx` — textarea con mismo sistema que Input

### Modify (aplicar componentes ui/ a forms existentes)
- `src/components/editor/BloqueCard.tsx` — reemplazar clases raw de input/select/button con componentes ui/
- `src/components/editor/BloqueEditor.tsx` — botones de agregar sección (sky/emerald/orange borders) → Button ghost con color de acento, botón "Guardar timeline" → Button filled
- `src/components/grilla/SlotForm.tsx` — reemplazar clases raw de input/select/button con componentes ui/
- `src/components/grilla/SlotPopover.tsx` — contenedor: reemplazar `rounded-lg border border-zinc-700 shadow-2xl` con tokens (`var(--r-lg)`, `var(--shadow-dropdown)`, borde `#2a2a2a`)
- `src/components/dashboard/ConfiguracionEditor.tsx` — inputs, textareas, botones (amber-600 → Button filled) con componentes ui/; sections → Card
- `src/components/dashboard/VocesManager.tsx` — inputs, selects, botones (indigo-600 → Button filled, border-red-700 → Button danger) con componentes ui/; card de voz → Card
- `src/components/voces/VozSelectorLocal.tsx` — select → Select; estado loading → mismo Select pero disabled; card de warning sin voces → Card con borde amber sutil
- `src/components/spotify/SpotifySetup.tsx` — selects → Select; botón "Iniciar sesión DJ" (amber-500 → Button pill); botón "Conectar con Spotify" (emerald-600 → Button pill); contenedores → Card
- `src/app/login/page.tsx` — reemplazar clases raw con componentes ui/; contenedor → Card
- `src/app/register/page.tsx` — reemplazar clases raw con componentes ui/; contenedor → Card
- `src/app/(dashboard)/programas/nuevo/page.tsx` — input y botón → componentes ui/
- `src/app/(dashboard)/anunciantes/page.tsx` — cards de anunciantes → Card

## Contracts

```ts
// Input
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

// Select
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
};

// Textarea
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

// Button (reemplaza el 016)
type ButtonVariant = "filled" | "pill" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";
type ButtonProps = {
  variant?: ButtonVariant;        // default: "filled"
  size?: ButtonSize;              // default: "md"
  icon?: React.ReactNode;
  href?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;
```

## Behavior

### Tokens CSS (globals.css)

Agregar como variables CSS bajo `:root`:

```
Radios:
  --r-xs: 6px
  --r-sm: 10px
  --r-md: 14px
  --r-lg: 18px
  --r-xl: 24px
  --r-full: 9999px

Sombras:
  --shadow-card: 0 2px 8px rgba(0,0,0,.45), 0 0 1px rgba(0,0,0,.6)
  --shadow-hover: 0 8px 24px rgba(0,0,0,.55), 0 0 1px rgba(0,0,0,.7)
  --shadow-dropdown: 0 16px 48px rgba(0,0,0,.7), 0 2px 8px rgba(0,0,0,.5)
  --shadow-focus: 0 0 0 3px rgba(255,255,255,.12)

Transiciones:
  --t-fast: 120ms ease
  --t-base: 200ms ease
```

### Input / Select / Textarea

Aspecto base igual para los tres:
- Fondo: `#1a1a1a`
- Border: `1px solid #333` en reposo
- Border focus: `1px solid #555` + `box-shadow: var(--shadow-focus)` (glow blanco muy sutil)
- Border radius: `var(--r-md)` (14px — notablemente más redondo que ahora)
- Padding: `12px 16px` (generoso, cómodo)
- Fuente: `text-sm`, color `#f5f5f5`
- Placeholder: `#555`
- Transición: `border-color var(--t-fast), box-shadow var(--t-fast)`
- NO `outline` — el focus ring lo da el `box-shadow`

Select específico:
- `appearance-none` para remover la flecha nativa
- Flecha custom: chevron SVG o Lucide `ChevronDown` posicionado absoluto a la derecha
- Wrapper `relative` con el icono de flecha dentro

Si se pasa `label`: renderiza un `<label>` encima del input con `text-xs font-medium text-zinc-400 mb-1`.
Si se pasa `error`: renderiza texto debajo `text-xs text-red-400 mt-1`.

### Button variantes

**`filled`** (acción principal, no crítica):
- Fondo: `#1a1a1a`, border: `1px solid #3a3a3a`
- Texto: `#f5f5f5`
- Hover: fondo `#252525`, border `#555`
- Border radius: `var(--r-md)`

**`pill`** (acción CTA o primaria destacada — el botón Spotify):
- Fondo: `#f5f5f5` (blanco/casi blanco)
- Texto: `#0a0a0a` (negro — máximo contraste)
- Hover: escala `1.03`, fondo `#ffffff`
- Border radius: `var(--r-full)` (completamente redondeado)
- Font-weight: `font-semibold`
- Transición: `transform var(--t-fast), background var(--t-fast)`
- Sombra: `var(--shadow-card)` en hover

**`secondary`**:
- Fondo transparente, border: `1px solid #3a3a3a`
- Texto: `#a3a3a3`
- Hover: fondo `#1a1a1a`, texto `#f5f5f5`
- Border radius: `var(--r-md)`

**`ghost`**:
- Sin fondo ni borde
- Texto: `#a3a3a3`
- Hover: texto `#f5f5f5`, fondo `rgba(255,255,255,.06)`
- Border radius: `var(--r-sm)`

**`danger`**:
- Fondo `rgba(239,68,68,.1)`, border: `1px solid rgba(239,68,68,.3)`
- Texto: `#f87171`
- Hover: fondo `rgba(239,68,68,.18)`, border `rgba(239,68,68,.5)`
- Border radius: `var(--r-md)`

Tamaños:
- `sm`: padding `6px 12px`, text `text-xs`
- `md`: padding `10px 20px`, text `text-sm`
- `lg`: padding `14px 28px`, text `text-base`

Todos los botones: `transition: all var(--t-fast)`, `cursor-pointer`, `disabled:opacity-40 disabled:cursor-not-allowed`.

### Card

- Fondo: `#111111`
- Border: `1px solid #222`
- Border radius: `var(--r-xl)` (24px — notable, Spotify usa radios grandes en cards)
- Sombra: `var(--shadow-card)`
- Hover (cuando `interactive=true`): sombra `var(--shadow-hover)`, fondo `#161616`
- Transición: `box-shadow var(--t-base), background var(--t-base)`

Prop adicional `interactive?: boolean` — agrega los estilos de hover.

### Badge

- Siempre `border-radius: var(--r-full)` — pill obligatorio
- Padding: `3px 10px`
- Font: `text-xs font-semibold tracking-wide`
- Sin bordes visibles — solo fondo semitransparente + texto en color
- Variantes de color como en 016 pero con los nuevos radios

### Table

- Header: `text-[11px] uppercase tracking-widest font-semibold text-zinc-500` — sin fondo especial
- Border entre filas: `border-b border-[#1e1e1e]` (muy sutil)
- Hover fila: `hover:bg-[#161616]` (casi imperceptible, no agresivo)
- Primera columna: `font-medium text-zinc-100`
- Sin bordes externos en la tabla — el contenedor Card los aporta

### Eliminaciones / limpiezas

En todos los archivos modificados, reemplazar:
- `rounded` → `rounded-xl` o el token correspondiente via clase Tailwind
- `rounded-lg` → `rounded-2xl` o token
- `bg-indigo-600` → variante `pill` o `filled` del Button
- Clases raw de input (`border border-zinc-700 bg-zinc-950 px-2 py-1.5`) → `<Input />`
- Clases raw de select (`border border-zinc-700 bg-zinc-950 px-2 py-2`) → `<Select />`

## Notes

- Los tokens CSS van en `:root` dentro de `globals.css` — Tailwind los puede consumir con `var(--...)` en `style={}` o como utilities custom si se configuran.
- Para Tailwind v4 (que usa `@theme inline`), las sombras y radios custom se pueden declarar ahí también. Verificar la versión en `package.json` antes de elegir la estrategia.
- `Button` con `href` renderiza como `<Link href={...}>` de Next.js — mismas clases, componente diferente.
- `Select` requiere wrapper `div relative` para posicionar la flecha. El componente maneja eso internamente.
- `Input`, `Select`, `Textarea` son client components solo si necesitan estado interno — si solo son wrappers de estilos, pueden ser server components. Preferir server component.
- La transición de escala `scale-[1.03]` en el botón `pill` usa `transform` — asegurarse que el parent no tenga `overflow: hidden` que la corte.

## AC
- [ ] Los inputs tienen radio ~14px, borde que se ilumina en focus sin outline nativo, fondo `#1a1a1a`
- [ ] Los selects tienen flecha custom (no la nativa del OS) y mismo estilo que inputs
- [ ] Existe botón variante `pill` con fondo blanco, texto negro, completamente redondeado y escala en hover
- [ ] El botón `danger` tiene fondo y borde en rojo semitransparente (no rojo sólido)
- [ ] Las cards tienen radio 24px y sombra negra visible
- [ ] Los badges son siempre pill (completamente redondeados)
- [ ] El formulario de login usa los nuevos componentes `Input` y `Button pill`
- [ ] `SlotForm` y `BloqueCard` usan `Input`, `Select`, `Button` — sin clases raw de formulario
- [ ] No hay ningún `bg-indigo-600` en los archivos modificados
- [ ] No hay ningún `rounded` (sin sufijo) aplicado a inputs, botones o cards en los archivos modificados

## Notes adicionales de los componentes revisados

- `SpotifyPanel` ya usa `rounded-full` en sus botones y `rounded-xl` en la cover — no tocar, es el estilo correcto.
- `BloqueEditor` tiene botones de tipo con colores semánticos (sky = apertura, emerald = noticia, orange = publicidad). Mantener los colores semánticos pero aplicar `Button` con `variant="ghost"` y clases de color por encima — no usar `filled` ni `pill` aquí para no perder la distinción visual entre tipos.
- `VozSelectorLocal` es un selector reutilizado en múltiples lugares. Al reemplazarlo con `Select`, las clases raw desaparecen de todos los sitios que lo usan sin tener que tocarlos.
- `SlotPopover` tiene posicionamiento fijo con `top`/`left` calculados — no cambiar la lógica, solo los tokens visuales del contenedor.
- `ConfiguracionEditor` usa `bg-amber-600` como botón primario (color de configuración). Migrar a `Button variant="filled"` — el rojo del sistema es válido aquí, no es necesario preservar el ámbar.
- `SpotifySetup` ya tiene `rounded-xl` en algunos contenedores — está más cerca del objetivo, solo ajustar tokens y reemplazar selects/botones.

## Changelog
- v1 (2026-05-25): spec inicial
- v2 (2026-05-25): agregados 7 archivos faltantes: BloqueEditor, SlotPopover, ConfiguracionEditor, VocesManager, VozSelectorLocal, SpotifySetup, anunciantes/page; notas sobre SpotifyPanel (no tocar) y botones semánticos de BloqueEditor
