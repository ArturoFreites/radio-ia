# Feature: Editor de programas — RSS, Cuña, Cierre y Duración
> Status: DONE
> v1 | 2026-05-26

## Why
El editor actual obliga a cargar noticias URL por URL y no expone los tipos CIERRE ni CUNA. Esta feature conecta los feeds RSS de la radio, agrega el bloque CIERRE, integra cuñas existentes como bloques y muestra la duración total del programa para controlar el costo de generación TTS.

## Files

### Create
- `src/app/api/noticias/rss/route.ts` — GET headlines estructurados desde `Radio.fuentesNoticias`
- `src/app/api/anunciantes/cunas/route.ts` — GET cuñas activas con audio, agrupadas por anunciante
- `worker/processors/cierre.ts` — processor BullMQ para el bloque CIERRE

### Modify
- `src/components/editor/BloqueEditor.tsx` — agregar botones CIERRE y CUNA; indicador de duración total
- `src/components/editor/BloqueCard.tsx` — formularios para CIERRE y CUNA; picker RSS en NOTICIA
- `src/app/api/bloques/[id]/generar-preview/route.ts` — agregar CIERRE a `TIPOS_PREVIEW`
- `worker/processors/generarPreview.ts` — rutear tipo CIERRE al processor cierre
- `worker/index.ts` — registrar processor cierre

## Contracts

### GET /api/noticias/rss
Lee `Radio.fuentesNoticias[]` de la radio en sesión. Usa la misma lógica de caché Redis que `lib/noticias/rss.ts` pero devuelve datos estructurados (no string formateado para Gemini).

```typescript
// Response 200
{
  noticias: Array<{
    titulo: string;
    resumen: string;
    url: string;      // item.link del feed
    fecha: string;    // ISO 8601
    fuente: string;   // dominio del feed
  }>
}
// Response 200 vacío si Radio.fuentesNoticias está vacío
{ noticias: [] }
```

### GET /api/anunciantes/cunas
Devuelve solo cuñas con `esActiva: true` y `audioUrl !== null`.

```typescript
// Response 200
{
  cunas: Array<{
    id: string;
    producto: string;
    duracion: number | null;
    audioUrl: string;
    anunciante: { id: string; nombre: string };
  }>
}
```

### Config del bloque CUNA
```typescript
{
  cunaId: string;
  cunaProducto: string;
  cunaAnunciante: string;
}
```

### Config del bloque CIERRE
```typescript
{
  nombrePrograma: string;   // pre-llenado con programa.nombre
  mensajeDespedida?: string; // opcional, libre
}
```

## Behavior

### Indicador de duración total
- En el header del `BloqueEditor`, muestra la suma de `bloque.duracion` de todos los bloques en segundos formateada como `M:SS`.
- Si la duración supera 900s (15 min): fondo amarillo + texto de advertencia "Superás los 15 min".
- Si supera 1800s (30 min): fondo rojo + texto "Superás los 30 min".
- Bloques sin `duracion` no cuentan (no se suman como 0 en el aviso; solo se avisa si hay duración real acumulada).

### Picker RSS en bloque NOTICIA
- Encima del campo URL actual, aparece un botón "Elegir del feed".
- Al hacer clic abre un dropdown/lista con los titulares del endpoint `/api/noticias/rss` (máx. 20 items, orden cronológico inverso).
- Al seleccionar un item: llena `urlNoticia` con `item.url` y dispara automáticamente el flujo "Analizar" existente.
- Si `Radio.fuentesNoticias` está vacío, el botón no aparece.
- La carga de los titulares es lazy (solo al primer clic en el botón).

### Bloque CIERRE
- Formulario: campo "Nombre del programa" (pre-llenado con `programa.nombre`), campo "Mensaje de despedida" (opcional), selector de voz.
- Genera guión via `buildCierrePrompt` + ElevenLabs TTS, mismo pipeline que APERTURA.
- Un solo locutor (una voz, `elevenlabsVoiceId`).
- Puede generarse preview con solo la voz asignada (sin mensaje de despedida).

### Bloque CUNA
- Botón "+ Cuña" abre un selector con las cuñas del endpoint `/api/anunciantes/cunas`.
- Al seleccionar, se crea el bloque con estado `LISTO` directamente (no genera nada; usa el audio existente de `Cuna.audioUrl`).
- `bloque.audioUrl` se fija en `Cuna.audioUrl` al crear el bloque.
- `bloque.duracion` se fija en `Cuna.duracion` al crear el bloque.
- En el formulario del bloque CUNA solo se muestra: nombre del anunciante, producto, player de audio y botón de eliminar. No hay campos editables ni botón de generar.
- Si la cuña no tiene audio (`audioUrl` null), no aparece en el selector.

## Notes

- El processor `cierre.ts` debe leer `programa.nombre` y `radio.nombre` + `radio.estiloLocucion` desde la DB para armar el prompt, igual que hace `apertura.ts`.
- `BloqueEditor` ya maneja el tipo `TipoSeccionCrear` como un union literal — hay que extenderlo con `"CIERRE" | "CUNA"`.
- El bloque CUNA no pasa por la queue de generación. El estado se setea a `LISTO` directamente en el POST de creación del bloque (`/api/programas/[id]/bloques`).
- Para que el POST de bloques pueda setear `LISTO` + `audioUrl` + `duracion` directamente, hay que leer `config.cunaId` en el handler cuando `tipo === "CUNA"` y resolver los valores de la cuña antes de crear el registro.
- Tener en cuenta que `buildCierrePrompt` ya existe en `lib/gemini/prompts/cierre.ts`.

## AC
- [ ] En el editor aparece el indicador de duración total y cambia de color según el umbral
- [ ] El botón "Elegir del feed" en NOTICIA carga los titulares del RSS y al seleccionar uno lanza el análisis automáticamente
- [ ] Si `Radio.fuentesNoticias` está vacío el botón RSS no aparece
- [ ] Se puede agregar un bloque CIERRE, configurarlo con voz y generar su preview
- [ ] Se puede agregar un bloque CUNA seleccionando una cuña existente; el bloque queda en estado LISTO inmediatamente con el audio de la cuña
- [ ] Las cuñas sin audio no aparecen en el selector de CUNA

## Changelog
- v1 (2026-05-26): spec inicial
