# Feature: Aire — sincronización broadcast (todos escuchan lo mismo)
> Status: OBSOLETE
> v1 | 2026-05-26

## Why
Cuando el link `/aire?token=...` se comparte con otra persona o se abre en otra PC, cada browser reproduce audio de forma independiente y desde el principio. Las acciones del operador (insertar publicidad demo, saltar bloque) tampoco se propagan. La transmisión debe ser única: todos los que tienen el link ven y escuchan lo mismo en tiempo real.

## Files

### Create
- `src/lib/aire/broadcaster.ts` — registro en memoria de conexiones SSE activas por radioId
- `src/app/api/aire/sse/route.ts` — endpoint SSE al que se suscriben todos los browsers
- `src/app/api/aire/sincronizar/route.ts` — el operador reporta bloque actual + timestamp de inicio
- `src/app/api/aire/demo-audio/route.ts` — recibe el audio generado de la demo, lo persiste y dispara broadcast

### Modify
- `src/types/grilla.ts` — añadir `AireBroadcastEvent`, `AireSyncState`; extender `EstadoAire`
- `src/app/api/aire/estado/route.ts` — incluir `sync` en la respuesta (estado actual de broadcast)
- `src/components/aire/AireController.tsx` — suscribirse a SSE; en evento DEMO_AUDIO reproducir audio
- `src/components/aire/ModoPrograma.tsx` — al arrancar, seek al segundo correcto según sync; al iniciar bloque, POST a /api/aire/sincronizar
- `src/components/aire/PublicidadDemoModal.tsx` — tras generar el Blob, subirlo a /api/aire/demo-audio en vez de devolver Blob directamente
- `prisma/schema.prisma` — añadir campos de sync al modelo Radio

## Contracts

```typescript
// Eventos que el servidor empuja a todos los suscriptores SSE
type AireBroadcastEvent =
  | { tipo: 'SYNC'; programaId: string; bloqueIndex: number; startedAt: string } // ISO string
  | { tipo: 'DEMO_AUDIO'; audioUrl: string; producto: string }
  | { tipo: 'MODO'; modo: 'DJ' | 'IDLE' }
  | { tipo: 'HEARTBEAT' }

// Estado de sync devuelto por GET /api/aire/estado
type AireSyncState = {
  programaId: string
  bloqueIndex: number
  startedAt: string // ISO string UTC
} | null

// EstadoAire extiende con:
// sync: AireSyncState
```

```prisma
// Añadir a model Radio:
aireSyncProgramaId  String?
aireSyncBloqueIndex Int?
aireSyncStartedAt   DateTime?
```

```typescript
// POST /api/aire/sincronizar — body
type SincronizarBody = {
  token: string
  programaId: string
  bloqueIndex: number
  startedAt: string // ISO string, el momento en que el bloque empezó a reproducirse
}

// POST /api/aire/demo-audio — multipart/form-data
// campo "audio": Blob (audio/mpeg)
// campo "token": string
// campo "producto": string
// Respuesta: { audioUrl: string } — URL relativa servible por el servidor

// GET /api/aire/sse?token=...
// Content-Type: text/event-stream
// Emite AireBroadcastEvent como JSON en el campo data
// Emite HEARTBEAT cada 25 segundos para mantener la conexión viva
```

```typescript
// broadcaster.ts — interfaz pública
export function subscribe(radioId: string, controller: ReadableStreamDefaultController): () => void
export function broadcast(radioId: string, event: AireBroadcastEvent): void
```

## Behavior

**Suscripción SSE**
- `AireController` abre `EventSource` a `/api/aire/sse?token=[aireToken]` al montar
- Si la conexión se corta, reconecta automáticamente (el navegador hace esto solo con `EventSource`)
- El servidor valida el token; si no es válido cierra la conexión con error

**Sync de posición al cargar (ModoPrograma)**
- Al arrancar `ModoPrograma`, si `EstadoAire.sync` está presente y coincide con el `programaId` actual:
  - Calcula `offsetSegundos = (Date.now() - Date.parse(sync.startedAt)) / 1000`
  - Navega a `sync.bloqueIndex` en la cola
  - Hace seek en el `HTMLAudioElement` a `offsetSegundos` antes de reproducir
- Si `offsetSegundos` supera la duración del bloque, avanza al siguiente bloque aplicando el tiempo restante

**Reporte de estado por el operador**
- Cada vez que `ModoPrograma` inicia la reproducción de un bloque (incluyendo el primer arranque), hace `POST /api/aire/sincronizar` con el índice y el `startedAt` del momento exacto en que `audio.play()` se resuelve
- El servidor guarda los campos `aireSyncProgramaId`, `aireSyncBloqueIndex`, `aireSyncStartedAt` en `Radio`
- El servidor emite evento `SYNC` a todos los suscriptores SSE del radioId
- Los otros browsers reciben el evento y hacen seek al segundo correcto en su propio `HTMLAudioElement`

**Sync en tiempo real (oyentes ya conectados)**
- Al recibir evento `SYNC` por SSE:
  - Si el browser ya está en el mismo `bloqueIndex` y `programaId` → calcula el seek desde `startedAt` y ajusta
  - Si el `bloqueIndex` es diferente → navega al bloque correcto y hace seek
  - Si el `programaId` es diferente → `AireController` recarga el estado (fetchEstado) para obtener el programa nuevo

**Publicidad demo sincronizada**
- `PublicidadDemoModal` genera el audio con ElevenLabs como hoy
- En vez de devolver el Blob al padre, hace `POST /api/aire/demo-audio` con el Blob como `multipart/form-data`
- El servidor guarda el archivo de audio en el storage (`/storage/audio/demo/`) y devuelve `{ audioUrl: string }`
- El servidor emite evento `DEMO_AUDIO` a todos los suscriptores SSE del radioId
- Todos los browsers (incluyendo el operador) reciben el evento y reproducen el audio con un `HTMLAudioElement` nuevo, fuera de la cola normal del programa
- El audio demo interrumpe el programa en todos los browsers simultáneamente (fade out de 0.5s antes, fade in al terminar)
- Si hay error al subir el audio, `PublicidadDemoModal` muestra el error y reproduce el audio solo localmente como fallback

**Broadcaster en memoria**
- `broadcaster.ts` mantiene un `Map<string, Set<ReadableStreamDefaultController>>` con las conexiones activas
- Funciona para un único proceso Next.js (Docker single instance)
- Si en el futuro se escala a múltiples instancias, se reemplaza el Map interno por Redis pub/sub sin cambiar la interfaz

**Modo DJ / IDLE**
- Cuando `AireController` cambia a modo `DJ` o `IDLE`, hace POST a `/api/aire/sincronizar` con `modo: 'DJ'` o `'IDLE'` (sin programaId/bloqueIndex)
- El servidor emite evento `MODO` a todos los suscriptores
- Otros browsers actualizan su modo visual (no hay sync de audio Spotify, solo la UI)

**Archivos de audio demo**
- Se guardan en `AUDIO_STORAGE_PATH/demo/[cuid].mp3`
- No se eliminan automáticamente (limpieza manual o cron futuro)
- Se sirven via `/api/audio/demo/[filename]` (nuevo route) con autenticación por aireToken

## Notes

- El seek en `HTMLAudioElement` puede fallar si el servidor no soporta range requests. El endpoint `/api/audio/stream` ya soporta ranges, no tocar.
- `startedAt` se captura en el browser del operador inmediatamente cuando `audio.play()` resuelve, no antes. Así el offset calculado por los oyentes es preciso.
- No sincronizar cuñas de la `ControlsBar` ("Insertar publicidad" de cuñas precargadas) en este spec — solo publicidad demo. Las cuñas se agregan en un spec separado.
- El `EventSource` nativo no soporta headers custom, por eso el token va como query param.
- Si dos instancias intentan reportar sync simultáneamente (edge case: el operador abre dos tabs), gana el POST más reciente.
- Los archivos de audio demo son temporales y semi-públicos (cualquier con el aireToken puede reproducirlos). No contienen datos sensibles.

## AC
- [ ] Abrir `/aire?token=X` en dos browsers al mismo tiempo: ambos reproducen el mismo bloque y están a menos de 2 segundos de diferencia de posición
- [ ] Abrir `/aire?token=X` cuando ya lleva 3 minutos reproduciéndose: el browser nuevo arranca en el bloque y segundo correcto, no desde el inicio
- [ ] El operador genera una publicidad demo: el audio se escucha en el browser del operador Y en el segundo browser con el mismo token, comenzando al mismo tiempo
- [ ] Mientras suena la publicidad demo, el programa principal hace fade out en ambos browsers
- [ ] Al terminar la publicidad demo, el programa retoma en ambos browsers
- [ ] Cambiar de modo (Programa → DJ) en el operador: el segundo browser actualiza su UI al modo DJ
- [ ] Si la conexión SSE se corta y reconecta, el browser se resincroniza automáticamente al bloque y segundo correctos
- [ ] `/api/aire/sse?token=invalido` devuelve error y cierra la conexión

## Changelog
- v1 (2026-05-26): spec inicial — SSE broadcast + clock-based seek + publicidad demo sincronizada
