# Feature: Vivo Icecast — transmisión única compartible
> Status: OBSOLETE
> v1 | 2026-05-26

## Why
Cuando el operador comparte el link `/escuchar?token=...`, todos los que lo abren deben escuchar exactamente lo mismo en tiempo real. La fuente de verdad es el audio que reproduce el browser del operador: programas pregrabados, modo DJ con Spotify, y publicidad demo. Todos los oyentes se conectan a un stream Icecast que ese browser alimenta. Si el operador inserta una publicidad demo, todos los oyentes la escuchan automáticamente porque es el mismo stream.

> Supersede la arquitectura de `036-feature-aire-sincronizacion-broadcast.md`. Si ese spec fue implementado, revertir los cambios de SSE/seek y los campos `aireSyncProgramaId`, `aireSyncBloqueIndex`, `aireSyncStartedAt` del modelo Radio.

## Files

### Create
- `src/lib/aire/icecast-relay.ts` — cliente Node.js que abre una conexión source a Icecast y hace pipe del stream entrante
- `src/app/api/aire/relay/route.ts` — recibe el stream de audio del browser del operador (PUT chunked) y lo reenvía a Icecast
- `src/app/api/audio/demo/[filename]/route.ts` — sirve archivos de audio demo (si ya fue creado en 036, conservar)
- `src/app/escuchar/page.tsx` — página pública de oyente: reproductor del stream Icecast + info visual
- `src/components/aire/TransmisionControl.tsx` — botón "Iniciar transmisión" con estado visual

### Modify
- `docker-compose.yml` — agregar servicio `icecast`
- `src/components/aire/AireController.tsx` — integrar `TransmisionControl`, gestionar captura de audio del tab y fetch al relay
- `src/app/api/aire/estado/route.ts` — incluir `streamUrl` en la respuesta `EstadoAire`
- `src/types/grilla.ts` — agregar `streamUrl: string | null` a `EstadoAire`
- `prisma/schema.prisma` — agregar `icecastMountpoint` al modelo Radio

## Contracts

```typescript
// EstadoAire extiende con:
// streamUrl: string | null  — URL completa del stream Icecast, null si Icecast no está configurado

// PUT /api/aire/relay?token=[aireToken]
// Body: ReadableStream de audio (audio/webm;codecs=opus — lo que MediaRecorder produce por defecto)
// Content-Type: el que envía el browser (se pasa tal cual a Icecast)
// Respuesta: 200 y mantiene la conexión abierta mientras el operador transmite
// El servidor cierra la conexión a Icecast cuando el cliente desconecta

// GET /escuchar — server component, sin NextAuth, valida aireToken igual que /aire
```

```prisma
// Agregar a model Radio:
icecastMountpoint   String?  // e.g. "/slug-radio.opus" — asignado al crear la radio con cuid corto
```

```yaml
# Nuevo servicio en docker-compose.yml
icecast:
  image: moul/icecast
  ports:
    - "8000:8000"
  environment:
    ICECAST_SOURCE_PASSWORD: ${ICECAST_SOURCE_PASSWORD:-radioflow_source}
    ICECAST_ADMIN_PASSWORD: ${ICECAST_ADMIN_PASSWORD:-radioflow_admin}
    ICECAST_RELAY_PASSWORD: ${ICECAST_RELAY_PASSWORD:-radioflow_relay}
    ICECAST_HOSTNAME: ${ICECAST_HOSTNAME:-localhost}
    ICECAST_MAX_CLIENTS: "100"
    ICECAST_MAX_SOURCES: "10"
```

```typescript
// Variables de entorno necesarias en app y worker:
// ICECAST_HOST — hostname del servicio icecast (default: "icecast" en Docker)
// ICECAST_PORT — default "8000"
// ICECAST_SOURCE_PASSWORD — contraseña source de Icecast
```

## Behavior

**Iniciar transmisión (operador en /aire)**
- `AireController` muestra `TransmisionControl` en la `ControlsBar`
- Estado inicial: botón "Iniciar transmisión" (gris)
- Al hacer clic:
  1. Llama a `getDisplayMedia({ audio: true, video: false })` — el browser muestra el picker nativo donde el operador selecciona el tab de `/aire`
  2. Si el operador cancela → vuelve al estado inicial, sin error visible
  3. Si concede permiso: crea un `MediaRecorder` sobre el `MediaStream` obtenido
  4. Abre un `fetch('PUT /api/aire/relay?token=...', { body: readableStream, duplex: 'half' })` con los chunks del `MediaRecorder` como body
  5. El botón cambia a "En transmisión" con punto rojo parpadeante
- Si la conexión al relay se corta (error de red, server reinicia): el botón vuelve a "Iniciar transmisión" automáticamente, sin bloquear al operador
- Botón "Detener transmisión": cierra el `MediaStream` y aborta el fetch

**Relay server (`PUT /api/aire/relay`)**
- Valida el `aireToken` del query param contra la DB
- Obtiene el `icecastMountpoint` de la radio
- Abre conexión source a Icecast: `PUT http://[ICECAST_HOST]:[ICECAST_PORT]/[mountpoint]` con headers `Authorization: Basic source:[ICECAST_SOURCE_PASSWORD]` y el `Content-Type` que llegó del cliente
- Hace pipe del `request.body` (stream) al Icecast: cada chunk que llega del browser va inmediatamente a Icecast
- Cuando el cliente desconecta (operador cierra tab o detiene transmisión): cierra la conexión a Icecast
- Si Icecast no está disponible (`ICECAST_HOST` no configurado o servicio caído): devuelve 503 con `{ error: "stream no disponible" }`; el botón del operador muestra el error

**Stream Icecast**
- El mountpoint de cada radio es único: se asigna al crear la radio (e.g. `/[cuid-corto].opus`)
- La URL del stream es `http://[ICECAST_HOSTNAME]:8000/[mountpoint]`
- Esta URL se guarda derivada, no en DB: se construye en runtime desde `icecastMountpoint` y las vars de entorno
- Se expone como `streamUrl` en `GET /api/aire/estado`
- Si no hay fuente activa, Icecast devuelve 404 en ese mountpoint

**Página de oyente (`/escuchar?token=...`)**
- Server component, sin NextAuth
- Valida `aireToken` → si inválido: 404
- Obtiene `streamUrl` y datos básicos de la radio
- Muestra:
  - Nombre y logo de la radio
  - `<audio src="[streamUrl]" autoplay controls>` — el browser del oyente conecta al stream Icecast directamente
  - Título de lo que está sonando (programa o canción DJ) — obtenido polleando `/api/aire/estado` cada 10 segundos
  - Indicador "EN VIVO" mientras el stream responde (el oyente detecta si el audio carga o da error)
  - Si `streamUrl` es null o el stream no responde: "La radio no está transmitiendo en este momento"
- Sin sidebar, sin controles de operador, sin grilla — solo el reproductor y la info visual

**Publicidad demo**
- No requiere cambios en `PublicidadDemoModal` ni en `AireController`
- El audio demo se reproduce en el browser del operador como hoy (via `HTMLAudioElement`)
- Ese audio es capturado por el `MediaRecorder` del tab junto con todo lo demás
- Los oyentes lo escuchan en el stream Icecast sin ninguna acción adicional
- Esto aplica también a cualquier otro audio que el operador reproduzca desde `/aire`

**streamUrl en /configuracion**
- La URL del stream Icecast se muestra también en la página de configuración de la radio
- El operador puede copiarla para cargarla en OBS, compartirla directamente, o usarla en otros reproductores

## Notes

- `getDisplayMedia({ audio: true, video: false })` funciona en Chrome y Edge. **Safari no lo soporta**: el operador debe usar Chrome o Edge para transmitir. Los oyentes pueden usar cualquier browser.
- El picker de `getDisplayMedia` requiere que el operador seleccione el tab manualmente — no se puede preseleccionar por seguridad del browser. El flujo exacto: abrir `/aire`, hacer clic en "Iniciar transmisión", elegir el tab de `/aire` en el picker del browser.
- `MediaRecorder` produce `audio/webm;codecs=opus` en Chrome. Icecast acepta este formato. Oyentes en Safari necesitan que Icecast esté configurado para servir también en un formato compatible (o usar un HLS proxy). Para el MVP, documentar que los oyentes usen Chrome/Firefox.
- El fetch con `duplex: 'half'` permite streaming de request body en browsers modernos. Verificar que el Next.js server no bufferice el body antes de hacer pipe — usar `request.body` como `ReadableStream` directamente.
- Si ya hay una fuente activa en el mountpoint (e.g. el operador abre dos tabs y transmite dos veces), Icecast puede rechazar la segunda fuente o reemplazar la primera — depende de la configuración. Para el MVP, documentar "un tab a la vez".
- El `icecastMountpoint` se genera al crear la radio (migración de Prisma que rellena los existentes con un cuid corto).
- La latencia del stream Icecast es típicamente 2-5 segundos. Es aceptable para radio.
- Si `ICECAST_HOST` no está en las env vars, `streamUrl` es `null` en todos lados — el feature queda desactivado limpiamente sin romper nada.

## AC
- [ ] El operador en `/aire` hace clic en "Iniciar transmisión", selecciona el tab → el botón muestra "En transmisión" con indicador rojo
- [ ] Mientras el operador transmite con un programa sonando: abrir `/escuchar?token=X` en otro browser muestra el reproductor activo y el audio empieza a sonar (< 5 segundos de delay)
- [ ] El operador genera una publicidad demo → el oyente en `/escuchar` la escucha sin ninguna acción adicional del operador
- [ ] En modo DJ (Spotify sonando): el oyente en `/escuchar` escucha el mismo audio de Spotify que el operador
- [ ] El operador hace clic en "Detener transmisión" → el stream Icecast cae → la página del oyente muestra "La radio no está transmitiendo"
- [ ] Abrir `/escuchar?token=invalido` devuelve 404
- [ ] Abrir `/escuchar?token=X` cuando no hay transmisión activa muestra "La radio no está transmitiendo en este momento"
- [ ] La URL del stream aparece en la página de configuración de la radio
- [ ] Si `ICECAST_HOST` no está configurado, no hay errores — `streamUrl` es null y la feature queda desactivada silenciosamente

## Changelog
- v1 (2026-05-26): spec inicial — browser del operador como fuente Icecast; todos los oyentes se conectan al mismo stream; publicidad demo incluida automáticamente
