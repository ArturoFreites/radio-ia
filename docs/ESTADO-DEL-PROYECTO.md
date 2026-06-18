# Estado del proyecto — RadioFlow AI
> Última actualización: 2026-05-13

Este documento es la brújula del proyecto. Describe qué está construido, qué funciona, qué está pendiente y hacia dónde va el producto. Es el primer archivo que hay que leer antes de tocar cualquier cosa.

---

## Qué es esto

Una plataforma web para emisoras de radio que permite:
1. Crear programas de radio con bloques de contenido
2. Generar guiones con IA (Gemini) y convertirlos a audio (ElevenLabs + Gemini TTS)
3. Emitir esos programas en vivo desde un panel web (Panel OBS)
4. Hacer DJing asistido por IA sobre Spotify (Modo DJ)

El operador de radio trabaja desde el dashboard. El panel de emisión es una URL tokenizada sin login que se abre en OBS como Browser Source.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.4 (App Router, React 19) |
| Base de datos | PostgreSQL via Prisma 6 |
| Cola de trabajos | BullMQ sobre Redis |
| IA texto | Google Gemini (`@google/genai`) |
| IA voz A | ElevenLabs TTS (diálogos, aperturas, publicidad) |
| IA voz B | Gemini TTS (cuñas, transiciones, entretenimiento) |
| Ensamble audio | FFmpeg |
| Música | Spotify Web Playback SDK |
| Streaming | Icecast 2 (config presente, NO integrado aún) |
| Auth | NextAuth v4 + bcrypt |
| UI | Tailwind v4 + Lucide + dnd-kit + Sonner |
| Deploy | Docker + Docker Compose |

---

## Modelo de datos (resumen)

```
Radio (tenant)
  └── Usuario[]           — operadores de la radio
  └── Programa[]          — episodios/programas
  │     └── Bloque[]      — segmentos ordenados del programa
  │     └── Generacion[]  — historial de generaciones
  └── Anunciante[]        — base de clientes publicitarios
  │     └── Cuna[]        — audios de publicidad
  └── RadioVoz[]          — voces asignadas a esa radio
  └── SpotifyConexion     — credenciales OAuth Spotify
  └── SpotifySesion[]     — sesiones de DJ activas
        └── PresentacionTrack[] — diálogos IA por track
```

---

## Funcionalidades existentes

### 1. Auth y multi-radio
- Login / registro con NextAuth (credenciales)
- Cada radio es un tenant aislado
- Roles: ADMIN / OPERADOR
- Planes: STARTER / PROFESSIONAL / ENTERPRISE (no aplicados todavía)
- Middleware protege todas las rutas del dashboard

### 2. Editor de programas (`/programas/[id]`)
- Crear programas con nombre y descripción
- Agregar bloques por tipo: APERTURA, NOTICIA, PUBLICIDAD (los únicos disponibles desde la UI actualmente)
- Drag-and-drop para reordenar (dnd-kit)
- Config por bloque: URL de noticia, nombre de anunciante, horario de apertura, etc.
- Selector de voces desde la DB (no llama a ElevenLabs API directamente)
- Guardar orden/config via `PATCH /api/programas/[id]/bloques`

**Tipos de bloque existentes en schema** (no todos disponibles en UI):
`INTRO | NOTICIAS | CUNA | ENTRETENIMIENTO | TRANSICION | SALUDO | CIERRE | APERTURA | NOTICIA | PUBLICIDAD`

### 3. Pipeline de generación (worker BullMQ)
- `POST /api/programas/[id]/generar` → encola job en BullMQ
- Worker (`worker/index.ts`) procesa:
  1. Genera guión con Gemini por cada bloque
  2. Genera audio: ElevenLabs para APERTURA/NOTICIA/PUBLICIDAD, Gemini TTS para el resto
  3. NOTICIA = diálogo dual (LOCUTOR_A + LOCUTOR_B), se ensambla con FFmpeg
  4. Ensambla programa completo en un MP3 final
- Almacenamiento local en `/storage/audio/[radioId]/[programaId]/`

### 4. Preview por bloque
- `POST /api/bloques/[id]/generar-preview` → job separado en BullMQ (`generarPreview`)
- Polling desde UI cada 2 s hasta estado LISTO
- Player `<audio>` inline en la BloqueCard
- Ruta: `/api/audio/preview/[bloqueId]`

### 5. Panel OBS (`/panel/[programaId]?token=[panelToken]`)
- URL tokenizada, sin login
- Lista todos los bloques con su audio
- Play uno por uno o play automático secuencial
- Botones: Play todo, Siguiente, Stop
- Estado: Reproduciendo / Detenido
- Diseñado para usarse como Browser Source en OBS

### 6. Modo DJ — Spotify (`/spotify` + `/panel/spotify/[sesionId]`)
- OAuth con Spotify (Premium requerido)
- Crear sesión eligiendo playlist + 2 voces
- Web Playback SDK: el navegador se convierte en device de Spotify
- Genera presentaciones IA entre tracks (diálogo 2 voces, ~80 palabras)
- Transición automática: fade out → overlay con cover → diálogo IA → fade in → siguiente track
- SSE via Redis pub/sub para comunicar worker → panel en tiempo real
- Si la generación falla, avanza sin corte
- PresentacionOverlay: muestra cover + artista + barra de progreso del audio

### 7. Voces (`/voces`)
- Catálogo de voces en DB (género, tono, idioma, geminiVoiceId)
- Asignar voces a la radio con alias
- VocesManager con vista de tarjetas

### 8. Anunciantes (`/anunciantes`)
- CRUD de anunciantes (nombre, contacto, rubro, notas)
- Asociados a la radio

### 9. Analytics (`/analytics`)
- Conteo de programas y generaciones
- Horas de audio generadas totales

### 10. Noticias automáticas
- RSS parser: lee fuentes configuradas en la radio
- Scraper web: extrae contenido de URLs de noticias individuales
- Clima: helper para datos meteorológicos (parcialmente implementado)

---

## Infraestructura

```
docker-compose.yml
├── app          — Next.js (puerto 3000)
├── worker       — BullMQ worker (proceso separado)
├── db           — PostgreSQL
├── redis        — Redis (colas + pub/sub)
└── icecast      — Icecast 2 (streaming, SIN integrar)
```

- `icecast.xml` existe pero no hay código que empuje audio a Icecast
- `Dockerfile` multi-stage para Next.js
- `Dockerfile.worker` para el proceso worker

---

## Lo que NO existe todavía (lo que le falta para ser una transmisión en vivo real)

### Crítico para emisión en vivo
1. **Icecast integration** — El Panel OBS reproduce audio en el navegador, pero no hay nada que empuje ese audio a un stream de Icecast para que los oyentes lo escuchen. Falta un puente (FFmpeg → Icecast o liquidsoap).
2. **Página pública de escucha** — No hay una página pública para que los oyentes sintonicen en vivo. Solo existe el panel interno.
3. **Estado de emisión en tiempo real** — El panel no sabe si hay oyentes, ni puede mostrar "en vivo" de forma real. Falta integración con la API de estadísticas de Icecast.
4. **Metadata push** — No hay push de "qué está sonando ahora" a Icecast (nowplaying metadata).

### Importante para el operador
5. **Grilla / programación horaria** — No hay scheduler. Los programas se ejecutan manualmente, no hay reloj de emisión.
6. **Clock de emisión en Panel OBS** — El panel no muestra hora actual, duración del programa, tiempo restante total.
7. **Preview del audio final** — No hay player del MP3 ensamblado final dentro del dashboard.
8. **Notificación de generación terminada** — El operador no sabe cuándo terminó la generación sin refrescar la página.

### Deuda técnica conocida
9. **Tipos de bloque no disponibles en UI** — INTRO, NOTICIAS, CUNA, ENTRETENIMIENTO, TRANSICION, SALUDO, CIERRE existen en el schema pero no se pueden crear desde el editor.
10. **Planes sin efecto** — STARTER/PROFESSIONAL/ENTERPRISE están en el schema pero no limitan nada.
11. **Clima incompleto** — El helper de clima existe pero no hay integración real con una API meteorológica.

---

## Specs activas en docs/features/

| Archivo | Estado | Descripción |
|---|---|---|
| `001-feature-spotify-djmode.md` | DONE | Modo DJ con Spotify |
| `002-feature-editor-rediseno.md` | TODO | Rediseño BloqueCard + BloqueEditor (gran parte ya implementada) |
| `003-feature-secciones-elevenlabs.md` | TODO | Agregar más tipos de bloque al editor |
| `004-feature-grilla-programacion.md` | TODO | Grilla semanal + overrides + pre-generación automática |
| `005-feature-pagina-de-aire.md` | TODO | Página de transmisión en vivo — cerebro de la radio autónoma |

---

## Rutas principales

| Ruta | Quién accede | Qué hace |
|---|---|---|
| `/dashboard` | Operador | Stats básicas |
| `/programas` | Operador | Lista de programas |
| `/programas/[id]` | Operador | Editor de bloques |
| `/programas/nuevo` | Operador | Crear programa |
| `/voces` | Operador | Gestionar voces |
| `/anunciantes` | Operador | Gestionar anunciantes |
| `/spotify` | Operador | Configurar Modo DJ |
| `/spotify/sesion/[id]` | Operador | Ver sesión DJ activa |
| `/analytics` | Operador | Estadísticas |
| `/configuracion` | Operador | Config de la radio |
| `/panel/[programaId]?token=` | OBS (sin login) | Panel de emisión de programa |
| `/panel/spotify/[sesionId]?token=` | OBS (sin login) | Panel DJ Spotify |

---

## Hacia dónde va el producto

El objetivo final es que **toda la operación de una radio ocurra desde una única página de transmisión en vivo**, donde:

- El operador ve el programa en curso (bloques, progreso)
- Los bloques se reproducen secuencialmente con manejo de audio real
- El audio llega a los oyentes vía stream (Icecast o similar)
- Los oyentes tienen una página pública para sintonizar
- El Modo DJ coexiste con los programas scripted
- El sistema puede funcionar semi-automáticamente (scheduler)

Ver debate de producto en conversación del 2026-05-13.
