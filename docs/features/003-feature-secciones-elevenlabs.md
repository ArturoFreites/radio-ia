# Feature: Secciones de Programa + TTS ElevenLabs
> Status: DONE
> v2 | 2026-06-01

## Why
Reemplazar el motor TTS de Gemini con ElevenLabs y definir tres tipos de sección (Apertura, Noticia, Publicidad) con pipelines de IA específicos para cada uno.

## Files

### Create
- `src/lib/elevenlabs/tts.ts` — cliente base para llamadas TTS a ElevenLabs
- `src/lib/gemini/prompts/apertura.ts` — prompt para guión de apertura
- `src/lib/gemini/prompts/noticia.ts` — prompt para diálogo de dos locutores
- `src/lib/gemini/prompts/publicidad.ts` — prompt para mención publicitaria + búsqueda de anunciante
- `src/lib/noticias/scraper.ts` — extrae contenido de URL con Gemini
- `src/lib/audio/dialogoParser.ts` — parsea líneas `LOCUTOR_A:` / `LOCUTOR_B:` a array de turnos
- `src/lib/audio/noticiaAudio.ts` — genera audio dual (un mp3 por turno + FFmpeg ensamblaje)
- `src/app/api/bloques/[id]/generar-preview/route.ts` — `POST`: encola generación en worker
- `src/app/api/bloques/[id]/analizar-noticia/route.ts` — `POST`: scraping y cache de URL
- `src/app/api/bloques/[id]/buscar-anunciante/route.ts` — `POST`: búsqueda info anunciante con Gemini
- `src/app/api/audio/preview/[bloqueId]/route.ts` — `GET`: sirve el MP3 preview desde disco

> **Nota de conflictos resueltos:** `src/app/api/voces/elevenlabs/route.ts` es responsabilidad de feature 010, no de este spec. `VozSelectorElevenLabs.tsx` es eliminado por feature 002 (reemplazado por `VozSelectorLocal.tsx`). Varios archivos de esta lista pueden ya existir de implementaciones previas — Cursor debe verificar antes de recrear.
- `worker/processors/apertura.ts` — genera guión + audio para bloques APERTURA
- `worker/processors/noticia.ts` — genera guión + audio dual para bloques NOTICIA
- `worker/processors/publicidad.ts` — genera guión + audio para bloques PUBLICIDAD

### Modify
- `prisma/schema.prisma` — agregar campos a `Bloque` (ver Contracts)
- `src/components/editor/BloqueCard.tsx` — formularios distintos por tipo de bloque
- `src/app/api/programas/[id]/route.ts` — `PUT`: validar previews al guardar timeline
- `worker/processors/generarPreview.ts` — router por tipo → procesador correspondiente
- `worker/index.ts` — registrar queue `generarPreviewQueue`
- `.env.example` — agregar `ELEVENLABS_API_KEY`
- `docker-compose.yml` — pasar `ELEVENLABS_API_KEY` a servicios `app` y `worker`

## Contracts

```prisma
// Cambios en model Bloque
elevenlabsVoiceId   String?    // voiceId principal (Apertura, Publicidad, Locutor A en Noticia)
elevenlabsVoiceId2  String?    // voiceId Locutor B (solo NOTICIA)
previewCachedAt     DateTime?  // cuándo se descargó el preview local
```

```typescript
// Extensión del campo config JSON por tipo
type AperturaConfig = {
  nombrePrograma: string
  horario: 'mañana' | 'tarde' | 'noche'
  duracionObjetivo: number
  // diaDeSemana se inyecta en runtime, no se guarda
}

type NoticiaConfig = {
  urlNoticia: string
  contenidoNoticiaCache?: string   // resultado del scraper, evita re-fetch
  duracionObjetivo: number
  estiloConversacion: 'profesional' | 'distendido'
}

type PublicidadConfig = {
  nombreAnunciante: string
  urlAnunciante?: string
  infoAnuncianteCache?: string     // descripción generada por Gemini, editable
  duracionObjetivo: number         // 15–30 s
}

// Turno del diálogo (salida de dialogoParser)
type TurnoDialogo = { locutor: 'A' | 'B'; texto: string }
```

```typescript
// API shapes nuevas
// POST /api/bloques/[id]/generar-preview  → { status: 'en_proceso' }
// POST /api/bloques/[id]/analizar-noticia body: { url }  → { contenido: string }
// POST /api/bloques/[id]/buscar-anunciante  → { info: string }
// GET  /api/audio/preview/[bloqueId]  → audio/mpeg stream
// PUT  /api/programas/[id] body: { bloques: { id, orden }[] }  → { ok: true, todosListos: boolean }
```

## Behavior

**Generación de preview (flujo general)**
- `POST /api/bloques/[id]/generar-preview` marca el bloque `GENERANDO_GUION` y encola un job en BullMQ; responde inmediatamente
- El worker genera guión (Gemini) → guarda en `bloque.guion` y marca `GUION_LISTO` → genera audio (ElevenLabs) → guarda en disco → actualiza `bloque.audioUrl`, `estado: 'LISTO'`, `previewCachedAt`
- El cliente hace polling a `GET /api/bloques/[id]` cada 2 s hasta `estado === 'LISTO'` o `'ERROR'` (timeout 3 min)

**APERTURA**
- Guión: prompt incluye nombre del programa, horario, día de semana (runtime), estilo de la radio
- Máximo 40 palabras, solo texto plano (sin markdown ni acotaciones)
- `getDiaDeSemana()` usa `Intl.DateTimeFormat` con locale `es-AR` y timezone `America/Argentina/Buenos_Aires`
- Audio: un solo MP3 con `elevenlabsVoiceId`

**NOTICIA**
- `POST /api/bloques/[id]/analizar-noticia`: extrae contenido de la URL con Gemini y lo guarda en `config.contenidoNoticiaCache`
- Guión: diálogo entre `LOCUTOR_A` y `LOCUTOR_B`, máximo 130 palabras en total, mínimo 4 turnos
- Parser verifica al menos 4 turnos; si no, reintenta el prompt una vez antes de fallar
- Audio: ElevenLabs genera un MP3 por turno, FFmpeg concatena con 300 ms de silencio entre turnos
- Verificar que duración final no supera 75 s (warning, no error bloqueante)

**PUBLICIDAD**
- `POST /api/bloques/[id]/buscar-anunciante`: Gemini genera descripción del anunciante y la guarda en `config.infoAnuncianteCache`
- Si el usuario edita manualmente la info, usar el texto editado (no re-buscar)
- Guión: menciona el anunciante al inicio y al cierre, duración proporcional a `duracionObjetivo`
- Audio: un solo MP3 con `elevenlabsVoiceId`

**Guardar timeline (PUT /api/programas/[id])**
- Actualiza orden de bloques en transacción
- Si todos los bloques tienen `estado === 'LISTO'` → actualiza `programa.estado = 'LISTO'`
- Responde `{ ok: true, todosListos: boolean }`

**Panel OBS**
- `GET /api/audio/preview/[bloqueId]` sirve el MP3 más reciente del directorio `/storage/audio/previews/[bloqueId]/`
- Si no existe → 404

## Notes

- ElevenLabs rate limit: en error 429, reintentar con backoff exponencial, máximo 3 intentos; luego marcar bloque como `ERROR`
- El worker captura errores por bloque individualmente; un bloque en `ERROR` no cancela otros jobs
- `contenidoNoticiaCache` e `infoAnuncianteCache` evitan re-llamadas a APIs externas si el usuario regenera

## AC
- [ ] Al pulsar "Generar preview" en APERTURA, el guión contiene el día de la semana y el nombre del programa sin markdown
- [ ] Al pulsar "Analizar" en NOTICIA con una URL válida, aparece un resumen del contenido en la UI
- [ ] El audio de NOTICIA combina dos voces distintas en el orden correcto del diálogo
- [ ] Al pulsar "Buscar información" en PUBLICIDAD, el textarea se llena con la descripción del anunciante
- [ ] El audio preview es accesible en `/api/audio/preview/[bloqueId]` sin autenticación
- [ ] Si `ELEVENLABS_API_KEY` no está configurado, los botones de generación muestran error claro sin llamar a la API
- [ ] Guardar el timeline con todos los bloques en `LISTO` retorna `todosListos: true`

## Changelog
- v1 (original): spec inicial
- v2 (2026-06-01): eliminar `VozSelectorElevenLabs.tsx` y `/api/voces/elevenlabs/route.ts` de la sección Create — son responsabilidad de features 002 y 010 respectivamente; agregar nota de conflictos resueltos
