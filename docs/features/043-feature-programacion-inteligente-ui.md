# Feature: Programación inteligente — grilla tabla + wizard crear slot
> Status: DONE
> v1 | 2026-06-12

## Why
La grilla debe seguir el render de Programación Inteligente: vista semanal en tabla como layout obligatorio y flujo guiado para crear slots DJ (playlist → voz → interrupciones).

## Files

### Create
- `src/components/grilla/GrillaSemanalHeader.tsx` — título, navegación de semana, toggles Hoy/Semana/Día, botón "+ Crear slot"
- `src/components/grilla/GrillaTablaSemanal.tsx` — grilla semanal en `<table>` con bloques de slot y leyenda de colores
- `src/components/grilla/SlotWizardDialog.tsx` — modal fullscreen mobile con wizard de 3 pasos para crear/editar slots DJ
- `src/components/grilla/InterruptionConfigCard.tsx` — tarjeta de configuración por tipo de interrupción
- `src/components/grilla/GrillaLeyenda.tsx` — leyenda inferior de tipos de bloque

### Modify
- `src/components/grilla/GrillaEditor.tsx` — usar tabla como vista principal; header nuevo; abrir wizard en lugar de popover para slots DJ
- `src/app/(dashboard)/grilla/page.tsx` — título "Grilla semanal" alineado al render
- `src/components/airon/PlaylistPicker.tsx` — búsqueda, tabs de filtro y vista detalle de playlist seleccionada
- `src/components/airon/SlotWizard.tsx` — estilos del stepper según render (lime, labels mobile)
- `src/components/grilla/SlotBloque.tsx` — variantes de color por tipo de slot para la tabla

## Contracts

```ts
type GrillaVistaModo = "hoy" | "semana" | "dia";

type SlotWizardDialogProps = {
  open: boolean;
  target: SlotFormTarget | null;
  onClose: () => void;
  onHecho: () => Promise<void>;
};
```

## Behavior

### Grilla semanal — tabla obligatoria
- La vista **Semana** (default) renderiza siempre un `<table>` con columna de horas y 7 columnas de días (LUN–DOM con número de fecha de la semana actual en Argentina).
- El día actual tiene header con acento lime (`--primary`) y fondo destacado.
- Bloques de slot muestran nombre de playlist, rango horario, badge "EN VIVO" si el slot coincide con el aire actual, y badge "DJ".
- Leyenda inferior con puntos de color: DJ en vivo, Presentación IA, Bloque musical, Evento puntual, Interrupciones.
- Toggle **Hoy**: lista timeline del día (ScheduleTimeline o equivalente compacto).
- Toggle **Día**: mantiene CalendarioSemanal existente para edición drag-and-drop de un solo día.
- Botón **+ Crear slot** abre el wizard con defaults (día hoy, 08:00, 60 min).

### Wizard crear/editar slot
- Modal grande (`max-w-2xl`, fullscreen en mobile) con `SlotWizard` de 3 pasos: Playlist → Voz → Interrupciones.
- Barra superior compacta editable: día de semana, hora inicio, duración (min).
- Paso Playlist: `PlaylistPicker` con búsqueda, tabs (Todos / Mis playlists), detalle de playlist seleccionada y estado "Spotify conectado".
- Paso Voz: grid de `VoiceCard` con preview; requiere selección para avanzar.
- Paso Interrupciones: 4 `InterruptionConfigCard` (Hora, Clima, Publicidad, Presentación IA) con toggle, intervalo y botón "Escuchar ejemplo" deshabilitado si no hay preview.
- Último paso: botón "Guardar slot" (lime). Persiste vía APIs existentes de slots/eventos.
- Edición de slot existente abre el mismo wizard con datos precargados.

### Estilos
- Acento lime del design system (`--primary`) en headers activos, botones primarios y selección.
- Sin cambios de API ni schema Prisma.

## Notes
- CalendarioSemanal se conserva solo para vista **Día** (drag-and-drop fino).
- Eventos puntuales siguen en sección inferior; al crear/editar usan el mismo wizard.

## AC
- [ ] Al abrir `/grilla`, la vista default es tabla semanal con 7 columnas y filas horarias
- [ ] "+ Crear slot" abre wizard de 3 pasos con estilo del render
- [ ] Se puede completar playlist → voz → interrupciones y guardar un slot nuevo
- [ ] Click en bloque de la tabla abre wizard en modo edición
- [ ] Leyenda de colores visible bajo la tabla
- [ ] Toggle Día muestra calendario drag-and-drop existente

## Changelog
- v1 (2026-06-12): Spec inicial desde render Programación Inteligente
