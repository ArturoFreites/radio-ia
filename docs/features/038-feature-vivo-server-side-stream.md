# Feature: Vivo server-side — worker + librespot + ffmpeg → Icecast
> Status: OBSOLETE
> v2 | 2026-05-26

## Why
El stream compartido necesita ser 100% server-side. **El browser del operador no reproduce ningún audio** — es solo un panel de control y visualización. Todo el audio (programas, Spotify DJ, voiceovers, publicidad demo) se ejecuta en el servidor y sale por Icecast. Los oyentes reciben ese único stream.

> Principio arquitectural: si suena en la radio, pasó por el worker → ffmpeg → Icecast. Nunca por el browser.

> Supersede los specs 036 y 037. Revertir los cambios de SSE/seek, campos aireSyncProgramaId/BloqueIndex/StartedAt, TransmisionControl y el relay browser→Icecast.

## Files

### Create
- `src/lib/aire/stream-manager.ts` — lógica del worker: orquesta el pipeline ffmpeg y decide qué fuente está activa
- `src/app/escuchar/page.tsx` — página pública de oyente: `<audio>` Icecast + info del programa
- `scripts/worker-stream.ts` — punto de entrada del worker para el pipeline de audio

### Modify
- `docker-compose.yml` — agregar servicios `icecast` y `librespot`
- `src/app/api/aire/estado/route.ts` — incluir `streamUrl` en la respuesta
- `src/types/grilla.ts` — agregar `streamUrl: string | null` a `EstadoAire`
- `prisma/schema.prisma` — agregar `icecastMountpoint` a Radio; agregar `LibrespotSesion` si hace falta
- `src/components/spotify/SpotifyPanel.tsx` — modo `'escucha'`: sin SDK, sin reproducción, solo display + control via Spotify API

### Delete
- `src/components/aire/TransmisionControl.tsx` — reemplazado por esta arquitectura
- `src/app/api/aire/relay/route.ts` — no se usa más
- `src/lib/aire/icecast-relay.ts` — no se usa más

## Contracts

```yaml
# docker-compose.yml — nuevos servicios

icecast:
  image: moul/icecast
  ports:
    - "8000:8000"
  environment:
    ICECAST_SOURCE_PASSWORD: ${ICECAST_SOURCE_PASSWORD:-radioflow_source}
    ICECAST_ADMIN_PASSWORD: ${ICECAST_ADMIN_PASSWORD:-radioflow_admin}
    ICECAST_HOSTNAME: ${ICECAST_HOSTNAME:-localhost}
    ICECAST_MAX_CLIENTS: "100"

librespot:
  image: ghcr.io/librespot-org/librespot:master
  environment:
    LIBRESPOT_USERNAME: ${SPOTIFY_LIBRESPOT_USERNAME}
    LIBRESPOT_PASSWORD: ${SPOTIFY_LIBRESPOT_PASSWORD}
    LIBRESPOT_NAME: "RadioFlow"
    LIBRESPOT_BITRATE: "320"
    LIBRESPOT_BACKEND: "pipe"         # output PCM a stdout
    LIBRESPOT_INITIAL_VOLUME: "100"
  # stdout del contenedor es PCM raw que el worker consume via pipe o socket
```

```typescript
// Variables de entorno nuevas:
// ICECAST_HOST            — hostname del servicio (default: "icecast" en Docker)
// ICECAST_PORT            — default "8000"
// ICECAST_SOURCE_PASSWORD — contraseña source
// ICECAST_HOSTNAME        — hostname público para construir streamUrl
// SPOTIFY_LIBRESPOT_USERNAME — cuenta Spotify Premium del servidor
// SPOTIFY_LIBRESPOT_PASSWORD — contraseña de esa cuenta

// EstadoAire agrega:
// streamUrl: string | null  — URL completa del stream, null si Icecast no está configurado
```

```prisma
// Agregar a model Radio:
icecastMountpoint   String?   // asignado al crear la radio, e.g. "/abc123.mp3"
```

```typescript
// stream-manager.ts — interfaz pública usada por el worker
export type FuenteActiva = 'LIBRESPOT' | 'PROGRAMA' | 'INSERCION' | 'SILENCIO'
// INSERCION: audio temporal que interrumpe la fuente actual (publicidad demo, voiceover)
// Al terminar la INSERCION, el stream-manager retoma la fuente anterior automáticamente

export function iniciarPipeline(mountpoint: string): void
export function cambiarFuente(fuente: FuenteActiva, archivoPath?: string): void
export function insertarAudio(archivoPath: string): Promise<void>  // bloquea hasta que termina el audio
export function detenerPipeline(): void
```

```typescript
// POST /api/aire/insertar-demo — body
type InsertarDemoBody = {
  token: string       // aireToken
  audioPath: string   // ruta en AUDIO_STORAGE_PATH del archivo generado
}
// El endpoint valida el token y encola la instrucción en el worker vía Redis o socket IPC
```

## Behavior

**Principio: el browser no toca el audio**
- Ningún componente del browser reproduce audio relacionado a la transmisión
- `HTMLAudioElement`, `AudioContext`, `MediaRecorder` y el Spotify Web Playback SDK dejan de usarse en `/aire` para reproducción
- El browser solo: muestra info visual, genera voiceovers (llama a ElevenLabs via API del server), envía comandos al worker

**Worker: gestión del pipeline**
- Al arrancar, el worker lee la grilla actual y determina qué debería estar sonando
- Inicia un proceso ffmpeg que hace pipe hacia Icecast (`PUT icecast://source:[password]@icecast:8000/[mountpoint]`)
- El worker elige la fuente de audio activa según la grilla:
  - Slot `PROGRAMA` con audio listo → `FuenteActiva = 'PROGRAMA'`: ffmpeg lee los archivos de bloque en orden
  - Slot `DJ` o sin slot → `FuenteActiva = 'LIBRESPOT'`: ffmpeg lee el stdout de librespot (PCM raw)
  - Sin programa listo y sin librespot disponible → `FuenteActiva = 'SILENCIO'`: ffmpeg genera silencio
- Cuando la grilla cambia (un slot termina, empieza otro), el worker cambia la fuente sin cortar el stream Icecast — el proceso ffmpeg sigue, solo cambia la fuente que lee

**ModoPrograma en el stream**
- El worker concatena los bloques de audio del programa en orden según la grilla
- Al terminar un bloque, lee el siguiente sin corte
- Al terminar el último bloque del programa, si el siguiente slot es DJ → cambia a LIBRESPOT
- Los `audioUrl` de los bloques son rutas locales en `AUDIO_STORAGE_PATH`

**ModoDJ en el stream (librespot)**
- librespot corre como servicio Docker, expone un dispositivo Spotify Connect llamado "RadioFlow"
- El operador abre su app de Spotify (móvil o desktop), selecciona "RadioFlow" como dispositivo Connect, y controla la reproducción desde ahí
- librespot produce PCM raw en su stdout; el worker lo lee como fuente de ffmpeg
- El worker monitorea eventos de librespot (track change, pause/play) a través del Spotify Web API

**Voiceovers del DJ en el stream**
- Cuando el Spotify API reporta que una canción terminó (o está por terminar):
  1. Worker genera el voiceover via ElevenLabs (igual que hoy, guarda el archivo)
  2. Worker pausa librespot (Spotify API: `PUT /me/player/pause`)
  3. Worker cambia la fuente de ffmpeg temporalmente al archivo de voiceover
  4. Al terminar el voiceover, worker reanuda librespot y vuelve la fuente a LIBRESPOT
- Desde el punto de vista del stream Icecast, es audio continuo sin corte

**Publicidad demo en el stream**
- El operador abre el modal de publicidad demo en `/aire` como hoy; escribe el guión, elige la voz
- La generación del audio ocurre en el servidor: el modal llama a `POST /api/publicidad/demo/generar` (ElevenLabs server-side), el servidor guarda el archivo en `AUDIO_STORAGE_PATH/demo/`
- El servidor responde con `{ audioPath: string }` — NO devuelve un Blob ni un URL de reproducción en el browser
- El modal muestra confirmación ("Publicidad lista") y un botón "Insertar al aire"
- Al confirmar, el modal llama a `POST /api/aire/insertar-demo` con el `audioPath`
- El worker recibe la instrucción via Redis/IPC, interrumpe la fuente actual (pausa librespot o el programa), reproduce el archivo vía ffmpeg, y reanuda la fuente anterior
- Todos los oyentes escuchan la publicidad porque pasa por Icecast; el browser del operador no reproduce nada

**Página de oyente (`/escuchar?token=...`)**
- Server component, sin NextAuth, valida `aireToken`
- Obtiene `streamUrl` de `/api/aire/estado`
- Muestra:
  - Nombre y logo de la radio
  - `<audio src="[streamUrl]" autoplay>` con controles básicos
  - Título de lo que está sonando, polleando `/api/aire/estado` cada 10 segundos
  - "EN VIVO" mientras el stream responde
  - "La radio no está transmitiendo" si `streamUrl` es null o el stream da error
- Sin sidebar, sin controles de operador

**Browser del operador — qué desaparece y qué queda**

Lo que desaparece del browser:
- Spotify Web Playback SDK (ya no reproduce en el browser)
- `HTMLAudioElement` para bloques del programa (ya no reproduce en el browser)
- `HTMLAudioElement` para voiceovers (ya no reproduce en el browser)
- `HTMLAudioElement` para publicidad demo (ya no reproduce en el browser)

Lo que queda en el browser (solo control y visualización):
- `SpotifyPanel` en modo display: muestra canción actual via `GET /me/player` (polling 5s), botones de skip/pause/play que llaman al Spotify API para controlar librespot
- `GrillaHoy`: muestra el estado de los slots del día
- `PublicidadDemoModal`: genera audio en el servidor y envía instrucción al worker; nunca reproduce nada localmente
- `RelojClock`, indicadores visuales de modo, título del bloque actual
- El operador escucha la radio en su propio dispositivo conectándose a librespot via Spotify Connect o abriendo `/escuchar` en otra pestaña

**streamUrl en /configuracion**
- La página de configuración muestra la URL del stream Icecast y la URL de oyente `/escuchar?token=...`
- El operador puede compartir la URL de oyente directamente

## Notes

- librespot necesita una cuenta **Spotify Premium** dedicada al servidor — no la cuenta personal del operador. Spotify ToS prohíbe usar una cuenta personal en un servidor público.
- El output de librespot con `--backend pipe` es PCM s16le, 44100Hz, stereo. El ffmpeg debe configurarse con los flags correctos: `-f s16le -ar 44100 -ac 2 -i pipe:0`.
- El cambio de fuente en ffmpeg mid-stream (sin cortar el stream Icecast) se puede lograr usando un named pipe (FIFO) como fuente de ffmpeg y switching qué escribe en ese FIFO. Alternativa: usar Liquidsoap como orquestador (más robusto, más complejo).
- El Spotify API `GET /me/player` usa el `accessToken` de la sesión Spotify de la radio, igual que hoy. Si el access token expira, el worker debe refrescarlo. Ver lógica existente en `src/lib/spotify/`.
- Si `ICECAST_HOST` no está configurado, `streamUrl` es null en todas partes. El feature queda desactivado sin errores.
- La publicidad demo sigue generando audio via ElevenLabs. Lo que cambia es el destino: en lugar de un Blob en el browser, se guarda en AUDIO_STORAGE_PATH y el worker lo inyecta en el stream.
- `icecastMountpoint` se genera al crear la radio. Para radios existentes: migración de Prisma que asigna uno con `cuid()` corto.
- Icecast debe ser accesible públicamente (puerto 8000 o via proxy nginx) para que los oyentes remotos puedan conectarse. En desarrollo local, `localhost:8000` alcanza.

## AC
- [ ] El operador abre su app de Spotify, ve "RadioFlow" como dispositivo Connect, conecta y reproduce una canción → los oyentes en `/escuchar` la escuchan sin ninguna acción en el browser
- [ ] Con un programa activo en la grilla, abrir `/escuchar` → escuchar los bloques del programa en orden sin intervención del operador
- [ ] Al terminar el horario del programa, el stream cambia automáticamente a ModoDJ (librespot) sin corte audible
- [ ] El operador genera publicidad demo → todos los oyentes la escuchan en el stream dentro de los siguientes 3 segundos
- [ ] El voiceover del DJ suena en el stream: la música pausa, se escucha el voiceover, la música retoma
- [ ] `/escuchar?token=invalido` devuelve 404
- [ ] Abrir `/escuchar` sin transmisión activa → "La radio no está transmitiendo"
- [ ] La URL del stream aparece en la página de configuración

## Changelog
- v1 (2026-05-26): spec inicial — arquitectura server-side completa: worker + librespot + ffmpeg → Icecast; browser es solo control/display
- v2 (2026-05-26): principio de "browser no toca audio" elevado a first-class; publicidad demo y voiceovers explícitamente server-side; interfaz stream-manager completa con insertarAudio
- v3 (2026-05-26): voiceovers DJ automáticos en worker-stream (`dj-voiceover-monitor`, `presentacionServicio`)
