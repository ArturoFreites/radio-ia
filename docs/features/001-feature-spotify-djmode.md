# Feature: Modo DJ — Infraestructura Spotify (OAuth, worker, modelos)
> Status: TODO
> v2 | 2026-05-21

> **UI supersedida por `009-feature-dj-simplificado.md`.**
> Este spec cubre solo la infraestructura: OAuth, Prisma models, worker de generación, SSE y panel OBS técnico.
> La gestión de sesiones y el entry point de usuario se eliminan del dashboard.

## Why
Infraestructura base para el Modo DJ: autenticación Spotify, pipeline de generación de diálogos IA y panel técnico para OBS.

## Files

### Create
- `src/app/(dashboard)/spotify/page.tsx` — página de configuración: conectar cuenta + crear sesión
- `src/app/(dashboard)/spotify/sesion/[id]/page.tsx` — detalle de sesión activa
- `src/app/panel/spotify/[sesionId]/page.tsx` — panel OBS standalone (sin header/sidebar)
- `src/app/api/spotify/auth/route.ts` — `GET`: inicia OAuth con Spotify
- `src/app/api/spotify/callback/route.ts` — `GET`: callback OAuth, guarda tokens
- `src/app/api/spotify/token/route.ts` — `GET`: devuelve access token fresco (con auto-refresh)
- `src/app/api/spotify/playlists/route.ts` — `GET`: lista playlists del usuario conectado
- `src/app/api/spotify/sesion/route.ts` — `POST`: crea sesión DJ
- `src/app/api/spotify/sesion/[id]/route.ts` — `GET`: info sesión, `DELETE`: finalizar
- `src/app/api/spotify/sesion/[id]/presentacion/route.ts` — `POST`: encola generación de presentación
- `src/app/api/spotify/sesion/[id]/eventos/route.ts` — `GET`: SSE stream de eventos en tiempo real
- `src/app/api/audio/spotify/[presentacionId]/route.ts` — `GET`: sirve MP3 de presentación
- `src/components/spotify/SpotifySetup.tsx` — formulario de creación de sesión (cliente)
- `src/components/spotify/SpotifyPanel.tsx` — panel OBS completo con lógica de reproducción (cliente)
- `src/components/spotify/SpotifyPlayer.tsx` — inicialización y control del Web Playback SDK
- `src/components/spotify/PresentacionOverlay.tsx` — overlay visual durante el diálogo
- `src/lib/spotify/auth.ts` — helpers OAuth y token refresh
- `src/lib/spotify/api.ts` — wrapper Spotify Web API
- `src/lib/spotify/prompts.ts` — prompt Gemini para diálogo de presentación
- `src/lib/spotify/generarPresentacion.ts` — pipeline completo: Gemini + ElevenLabs + FFmpeg
- `worker/processors/spotify/generarPresentacion.ts` — procesador BullMQ

### Modify
- `prisma/schema.prisma` — agregar `SpotifyConexion`, `SpotifySesion`, `PresentacionTrack`, relaciones en `Radio`
- `src/lib/redis.ts` — agregar `redisPublish` y `redisSubscribe`
- `worker/index.ts` — registrar queue `spotify-presentaciones`
- `src/components/dashboard/Sidebar.tsx` — agregar link "Modo DJ" a `/spotify`
- `.env.example` — agregar `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`
- `docker-compose.yml` — pasar variables Spotify a servicios `app` y `worker`

## Contracts

```prisma
model SpotifyConexion {
  id             String   @id @default(cuid())
  radioId        String   @unique
  radio          Radio    @relation(fields: [radioId], references: [id])
  spotifyUserId  String
  accessToken    String
  refreshToken   String
  tokenExpiresAt DateTime
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  sesiones       SpotifySesion[]
}

model SpotifySesion {
  id             String              @id @default(cuid())
  radioId        String
  radio          Radio               @relation(fields: [radioId], references: [id])
  conexionId     String
  conexion       SpotifyConexion     @relation(fields: [conexionId], references: [id])
  playlistId     String
  playlistNombre String
  voz1Id         String              // ElevenLabs voiceId (geminiVoiceId de tabla Voz)
  voz2Id         String
  estado         EstadoSesionSpotify @default(ACTIVA)
  panelToken     String              @unique @default(cuid())
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt
  presentaciones PresentacionTrack[]
}

enum EstadoSesionSpotify { ACTIVA PAUSADA FINALIZADA }

model PresentacionTrack {
  id             String             @id @default(cuid())
  sesionId       String
  sesion         SpotifySesion      @relation(fields: [sesionId], references: [id], onDelete: Cascade)
  trackSpotifyId String
  trackNombre    String
  artistaNombre  String
  albumNombre    String
  duracionMs     Int
  coverUrl       String?
  guion          String?
  audioUrl       String?
  estado         EstadoPresentacion @default(PENDIENTE)
  errorLog       String?
  createdAt      DateTime           @default(now())
  @@unique([sesionId, trackSpotifyId])
}

enum EstadoPresentacion { PENDIENTE GENERANDO LISTA ERROR }
```

```typescript
// POST /api/spotify/sesion body
type CrearSesionBody = {
  playlistId: string
  playlistNombre: string
  voz1Id: string
  voz2Id: string
}
// → { sesionId: string, panelUrl: string }

// SSE eventos (canal: spotify:sesion:[id])
type EventoSSE =
  | { tipo: 'PRESENTACION_LISTA'; trackSpotifyId: string; audioUrl: string }
  | { tipo: 'TOKEN_REFRESH' }

// Panel OBS — acceso sin login
// /panel/spotify/[sesionId]?token=[panelToken]
```

## Behavior

**OAuth Spotify**
- Scopes requeridos: `streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative`
- `GET /api/spotify/token` refresca automáticamente si `tokenExpiresAt - now < 5 min`
- Panel llama a este endpoint para obtener siempre un token válido (no expone refreshToken al cliente)

**Crear sesión**
- `POST /api/spotify/sesion`: crea `SpotifySesion`, carga los primeros 50 tracks de la playlist, crea `PresentacionTrack` en `PENDIENTE` para cada uno, encola generación para los primeros 3 tracks

**Pipeline de generación (worker)**
1. Carga `PresentacionTrack` + sesión → marca `GENERANDO`
2. Obtiene géneros/popularidad del artista desde Spotify API
3. Genera diálogo con Gemini (máximo 80 palabras, formato `LOCUTOR_A:` / `LOCUTOR_B:`, dato curioso de LOCUTOR_B)
4. TTS con ElevenLabs por turno (misma lógica que `noticiaAudio.ts`)
5. FFmpeg ensambla con 200 ms de silencio entre turnos
6. Guarda en `/storage/audio/spotify/[presentacionId].mp3`
7. Actualiza `PresentacionTrack: { estado: LISTA, audioUrl }`
8. Publica en Redis `spotify:sesion:[id]` → SSE llega al panel

**Panel OBS (SpotifyPanel)**
- Al montar: pide token, carga SDK de Spotify vía script dinámico, transfiere playback al device, inicia playlist
- Se conecta al SSE `GET /api/spotify/sesion/[id]/eventos`
- Pre-generación: cuando quedan < 90 s del track actual, solicita presentación del siguiente (`POST /api/spotify/sesion/[id]/presentacion`)
- Transición (~10 s antes del fin, si la presentación está lista):
  1. Fade out Spotify en 3 s → pause
  2. Muestra `PresentacionOverlay` + reproduce audio de presentación
  3. Al terminar audio → oculta overlay → resume → fade in en 2 s
- Si `estado === 'ERROR'` al llegar el momento de transición: salta directamente al siguiente track sin diálogo (transmisión no se interrumpe)
- Token refresh automático cada 50 min: `player.setOAuthToken(nuevoToken)`

**PresentacionOverlay**
- Fondo oscuro semitransparente sobre el panel
- Muestra: cover art, nombre del tema, artista — álbum, barra de progreso del audio
- Animación CSS de entrada/salida

**Acceso al panel**
- Server component verifica `panelToken` en DB antes de renderizar; si no coincide → `notFound()`
- No requiere sesión de NextAuth

**SSE (Redis Pub/Sub)**
- El handler SSE suscribe al canal Redis de la sesión y envía eventos al cliente
- Keep-alive con comentario `: keep-alive\n\n` cada 15 s
- Cleanup al abortar la request: desuscribirse y cerrar el stream

## Notes

- Spotify Premium es obligatorio para Web Playback SDK; detectar el error de inicialización y mostrar mensaje claro
- `@@unique([sesionId, trackSpotifyId])` en Prisma: usar `upsert` al crear `PresentacionTrack`
- `player.nextTrack()` después del diálogo: verificar primero si el track ya cambió durante la pausa; solo llamar si no cambió
- Spotify ya no admite `http://localhost` en Redirect URIs; usar `http://127.0.0.1:3000/api/spotify/callback` en desarrollo
- Reutilizar `parsearDialogo`, `elevenLabsTTS`, `ensamblarSecuencia` de `src/lib/audio/` — no duplicar

## AC
- [ ] El operador conecta su cuenta Spotify desde `/spotify` y el dropdown de playlists muestra sus playlists reales
- [ ] El dropdown de voces usa `GET /api/voces` (DB), no llama a ElevenLabs API
- [ ] Al iniciar sesión, la URL del panel es accesible sin login con el token correcto
- [ ] El navegador se convierte en device de Spotify (aparece en Spotify Connect)
- [ ] La playlist empieza a reproducirse con audio desde el navegador
- [ ] El fade-out empieza ~10 s antes del fin de un track cuando la presentación está lista
- [ ] El diálogo de presentación se reproduce sin cortes entre las dos voces
- [ ] El siguiente track inicia con fade-in al terminar el diálogo
- [ ] Si la generación falla, el track siguiente arranca directamente sin interrumpir la transmisión
