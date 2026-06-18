# Feature: Rediseño del editor de programa
> Status: DONE
> v2 | 2026-06-01

## Why
El editor actual mezcla tres zonas de configuración sin orden claro. El selector de voces llama a la API externa de ElevenLabs en lugar de leer la DB local.

## Files

### Create
- `src/components/voces/VozSelectorLocal.tsx` — selector de voces desde `GET /api/voces` (DB, no ElevenLabs API)
- `src/app/api/bloques/[id]/route.ts` — agregar handler `DELETE`

### Modify
- `src/components/editor/BloqueCard.tsx` — reescritura completa: fila colapsable + formulario expandido por tipo + polling de preview
- `src/components/editor/BloqueEditor.tsx` — reescritura completa: layout vertical, botones de agregar por tipo, DnD con `@dnd-kit`
- `src/app/(dashboard)/programas/[id]/page.tsx` — eliminar `AddBloqueForm` y `GenerarContenidoButton`

### Delete
- `src/components/editor/AddBloqueForm.tsx` — reemplazado por botones inline en `BloqueEditor`
- `src/components/editor/GenerarContenidoButton.tsx` — confunde el flujo; preview ahora es por sección
- `src/components/voces/VozSelectorElevenLabs.tsx` — llamaba a ElevenLabs API directo; reemplazado por `VozSelectorLocal`

> **Nota:** `src/app/api/voces/elevenlabs/route.ts` NO se elimina — lo usa `VocesManager` para agregar voces a la DB (ver feature 010).

## Contracts

```typescript
type BloqueEditorItem = {
  id: string
  titulo: string
  tipo: TipoBloque
  orden: number
  vozId: string | null
  config: Record<string, unknown>
  estado: string
  elevenlabsVoiceId: string | null
  elevenlabsVoiceId2: string | null
  guion: string | null
  audioUrl: string | null
  duracion: number | null
}

// VozSelectorLocal props
type VozSelectorLocalProps = {
  label: string
  value: string | null          // ElevenLabs voiceId (voz.geminiVoiceId)
  onChange: (elevenLabsVoiceId: string) => void
  disabled?: boolean
}

// Callbacks de BloqueCard hacia BloqueEditor
type BloqueCardCallbacks = {
  onDelete: (bloqueId: string) => void
  onUpdate: (bloqueId: string, patch: Partial<BloqueEditorItem>) => void
  onExpand: (bloqueId: string | null) => void
}

// Config por defecto al crear un bloque
const defaultConfig = {
  APERTURA:   { nombrePrograma: '', horario: 'mañana', duracionObjetivo: 30 },
  NOTICIA:    { urlNoticia: '', duracionObjetivo: 60, estiloConversacion: 'profesional' },
  PUBLICIDAD: { nombreAnunciante: '', urlAnunciante: '', duracionObjetivo: 20 },
}
```

## Behavior

**VozSelectorLocal**
- Lee voces de `GET /api/voces` (retorna `Array<{ vozId, voz: { nombre, geminiVoiceId, genero, tono } }>`)
- El `value` y el `onChange` usan `voz.geminiVoiceId` (el ElevenLabs voice ID real), no el `vozId` de BD
- Si no hay voces, muestra enlace a `/voces`
- Se recarga cada vez que el componente se monta

**BloqueCard — colapsado**
- Muestra: handle drag, badge tipo (color por tipo), título editable inline, badge estado, duración (si existe), botón play (si tiene `audioUrl`), botón eliminar
- Click en la fila la expande; click de nuevo la colapsa
- Título editable: blur → `PATCH /api/bloques/[id]` con `{ titulo }`
- Eliminar: confirmar → `DELETE /api/bloques/[id]` → `onDelete(id)`

**BloqueCard — expandido (formulario por tipo)**
- APERTURA: nombre programa, horario, `VozSelectorLocal`, "Guardar config", "Generar preview"
- NOTICIA: URL + botón "Analizar" (`POST /api/bloques/[id]/analizar-noticia`), resumen colapsable, Voz A, Voz B, estilo, "Guardar config", "Generar preview"
- PUBLICIDAD: nombre anunciante, URL (opcional), "Buscar información" (`POST /api/bloques/[id]/buscar-anunciante`), textarea info (editable), slider duración 15–30 s, `VozSelectorLocal`, "Guardar config", "Generar preview"
- "Guardar config": `PATCH /api/bloques/[id]` con config y voces actuales
- "Generar preview": `POST /api/bloques/[id]/generar-preview` → spinner → polling `GET /api/bloques/[id]` cada 2 s hasta `estado === 'LISTO'` o `'ERROR'` (timeout 3 min) → `onUpdate(id, { audioUrl, duracion, estado })` sin reload
- Audio player inline: `<audio controls>` nativo, solo si `audioUrl?.startsWith('/api/audio/preview/')`

**BloqueEditor**
- Layout vertical: lista de secciones (sortable) → botones [+ Apertura] [+ Noticia] [+ Publicidad] → botón "Guardar timeline"
- Crear sección: `POST /api/programas/${programaId}/bloques` → agrega al estado local y expande automáticamente
- Solo una sección expandida a la vez (`expandedId: string | null`)
- Reordenar: `@dnd-kit/core` + `@dnd-kit/sortable` con `verticalListSortingStrategy`, orden optimista en local
- Guardar timeline: `PATCH /api/programas/${programaId}/bloques` con `{ bloques: [{ id, orden }] }` → toast éxito/error; si `todosListos === true` mostrar mensaje adicional

**DELETE /api/bloques/[id]**
- Verificar sesión y pertenencia a la radio del usuario
- `prisma.bloque.delete({ where: { id } })`
- Eliminar directorio `/storage/audio/previews/${id}/` si existe (`fs.rm`, `{ recursive: true, force: true }`)
- Retorna `{ ok: true }`

**Página /programas/[id]**
- Eliminar `AddBloqueForm` y `GenerarContenidoButton`; mantener solo título y `<BloqueEditor>`

## Notes
- El polling en `BloqueCard` debe limpiarse si el componente se desmonta o se elimina el bloque durante la generación
- `window.location.reload()` está prohibido en toda la feature — actualizar estado local
- El drag handle debe tener `aria-label="Reordenar sección"`

## AC
- [x] El dropdown de voces en BloqueCard muestra las voces de `/api/voces` (DB), sin llamar a ElevenLabs API
- [x] Crear una sección con [+ Apertura] abre el formulario expandido automáticamente
- [x] "Generar preview" muestra spinner mientras genera y muestra el player inline al terminar, sin reload
- [x] Eliminar un bloque lo quita de la lista sin reload
- [x] Reordenar por drag actualiza el orden al guardar el timeline
- [x] Solo una sección puede estar expandida a la vez

## Changelog
- v1 (original): spec inicial
- v2 (2026-06-01): eliminar la instrucción de borrar `/api/voces/elevenlabs/route.ts` — esa ruta la usa VocesManager (feature 010); solo se borra `VozSelectorElevenLabs.tsx`
