# RadioFlow AI — Documento Técnico de Implementación

## CONTEXTO DEL PROYECTO

RadioFlow AI es una plataforma SaaS multi-tenant que permite a emisoras de radio reemplazar locutores humanos y equipos de producción. La plataforma genera contenido hablado con IA (guiones + voz sintética) y lo expone como una URL de navegador que OBS Studio consume como fuente de audio. La música, jingles y cortinas los maneja la radio por separado en OBS.

### Stack Tecnológico

- **Frontend + API:** Next.js 14+ (App Router)
- **Base de datos:** PostgreSQL (Docker)
- **Cache y colas:** Redis (Docker)
- **Streaming de audio:** Icecast (Docker)
- **Worker de procesamiento:** Node.js con Bull queue
- **IA — Texto y TTS:** Google Gemini API
- **Procesamiento de audio:** FFmpeg
- **Almacenamiento de audio:** Local (Docker volume) → S3 en producción
- **Autenticación:** NextAuth.js
- **ORM:** Prisma
- **UI:** Tailwind CSS + shadcn/ui
- **Containerización:** Docker + docker-compose

### Mercado Inicial

- País: Argentina
- Cliente piloto: Radio Dejavu
- Modelo: Suscripción mensual ($29 / $79 / $149)

---

## ARQUITECTURA DOCKER

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://radioflow:radioflow@db:5432/radioflow
      - REDIS_URL=redis://redis:6379
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=http://localhost:3000
      - ICECAST_HOST=icecast
      - ICECAST_PORT=8000
      - AUDIO_STORAGE_PATH=/app/storage/audio
    volumes:
      - audio_storage:/app/storage/audio
    depends_on:
      - db
      - redis
      - icecast

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      - DATABASE_URL=postgresql://radioflow:radioflow@db:5432/radioflow
      - REDIS_URL=redis://redis:6379
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - ICECAST_HOST=icecast
      - ICECAST_PORT=8000
      - AUDIO_STORAGE_PATH=/app/storage/audio
    volumes:
      - audio_storage:/app/storage/audio
    depends_on:
      - db
      - redis
      - icecast

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=radioflow
      - POSTGRES_PASSWORD=radioflow
      - POSTGRES_DB=radioflow
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  icecast:
    image: libretime/icecast:2.4.4
    ports:
      - "8000:8000"
    volumes:
      - ./icecast.xml:/etc/icecast.xml
    environment:
      - ICECAST_SOURCE_PASSWORD=radioflow_source
      - ICECAST_ADMIN_PASSWORD=radioflow_admin
      - ICECAST_RELAY_PASSWORD=radioflow_relay

volumes:
  pg_data:
  audio_storage:
```

---

## ESTRUCTURA DE CARPETAS

```
radioflow/
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.worker
├── icecast.xml
├── .env.local
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Landing / Login
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # Sidebar + header compartido
│   │   │   ├── dashboard/page.tsx      # Home del dashboard
│   │   │   ├── programas/
│   │   │   │   ├── page.tsx            # Lista de programas
│   │   │   │   ├── nuevo/page.tsx      # Editor de bloques (crear)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx        # Ver/editar programa
│   │   │   │       └── generar/page.tsx # Generar contenido
│   │   │   ├── voces/page.tsx          # Catálogo de voces
│   │   │   ├── anunciantes/
│   │   │   │   ├── page.tsx            # Lista anunciantes
│   │   │   │   └── [id]/page.tsx       # Detalle anunciante
│   │   │   ├── panel/
│   │   │   │   └── [programaId]/page.tsx  # Panel OBS (URL para navegador)
│   │   │   ├── configuracion/page.tsx  # Config de radio
│   │   │   └── analytics/page.tsx      # Métricas de uso
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── programas/
│   │       │   ├── route.ts            # CRUD programas
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── generar/route.ts    # Dispara generación IA
│   │       │       └── bloques/route.ts    # CRUD bloques
│   │       ├── voces/
│   │       │   ├── route.ts            # Listar voces
│   │       │   └── preview/route.ts    # Preview de voz
│   │       ├── anunciantes/route.ts
│   │       ├── contenido/
│   │       │   ├── noticias/route.ts   # Fetch noticias RSS
│   │       │   ├── entretenimiento/route.ts
│   │       │   └── cunas/route.ts
│   │       ├── audio/
│   │       │   ├── generar/route.ts    # Genera TTS de un bloque
│   │       │   ├── ensamblar/route.ts  # FFmpeg ensambla programa
│   │       │   └── stream/[id]/route.ts # Sirve audio
│   │       └── panel/
│   │           └── [programaId]/route.ts # API del panel OBS
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components
│   │   ├── editor/
│   │   │   ├── BloqueEditor.tsx        # Editor drag & drop
│   │   │   ├── BloqueCard.tsx          # Card de cada bloque
│   │   │   ├── BloqueTimeline.tsx      # Vista timeline
│   │   │   └── TipoBloqueSelector.tsx  # Selector de tipo
│   │   ├── voces/
│   │   │   ├── VozCard.tsx             # Card con preview
│   │   │   └── VozSelector.tsx         # Selector en bloques
│   │   ├── panel/
│   │   │   ├── PanelOBS.tsx            # Panel completo OBS
│   │   │   ├── BloquePlayer.tsx        # Reproductor por bloque
│   │   │   └── ControlTransporte.tsx   # Play/pause/stop
│   │   ├── contenido/
│   │   │   ├── GuionPreview.tsx        # Preview de guión generado
│   │   │   ├── NoticiasFeed.tsx        # Feed de noticias
│   │   │   └── CunaForm.tsx            # Form datos anunciante
│   │   └── dashboard/
│   │       ├── Sidebar.tsx
│   │       ├── StatsCards.tsx
│   │       └── ProgramasList.tsx
│   ├── lib/
│   │   ├── prisma.ts                   # Cliente Prisma
│   │   ├── redis.ts                    # Cliente Redis
│   │   ├── auth.ts                     # Config NextAuth
│   │   ├── gemini/
│   │   │   ├── client.ts              # Cliente Gemini API
│   │   │   ├── guiones.ts             # Generación de guiones
│   │   │   ├── tts.ts                 # Text-to-Speech
│   │   │   └── prompts/
│   │   │       ├── noticias.ts        # Prompt para noticieros
│   │   │       ├── cunas.ts           # Prompt para cuñas
│   │   │       ├── entretenimiento.ts # Prompt para entretenimiento
│   │   │       └── transiciones.ts    # Prompt para transiciones
│   │   ├── audio/
│   │   │   ├── ffmpeg.ts             # Wrapper FFmpeg
│   │   │   ├── ensamblar.ts          # Ensamblaje de bloques
│   │   │   └── storage.ts            # Manejo de archivos
│   │   ├── noticias/
│   │   │   ├── rss.ts                # Parser RSS
│   │   │   ├── fuentes.ts            # Fuentes por región
│   │   │   └── argentina.ts          # Fuentes Argentina
│   │   ├── entretenimiento/
│   │   │   ├── efemerides.ts
│   │   │   ├── clima.ts
│   │   │   ├── horoscopo.ts
│   │   │   └── trivias.ts
│   │   └── queue/
│   │       ├── jobs.ts               # Definición de jobs
│   │       └── workers.ts            # Procesadores
│   └── types/
│       ├── programa.ts
│       ├── bloque.ts
│       ├── voz.ts
│       └── anunciante.ts
└── worker/
    ├── index.ts                       # Entry point del worker
    ├── processors/
    │   ├── generarGuion.ts
    │   ├── generarAudio.ts
    │   └── ensamblarPrograma.ts
    └── utils/
        └── icecast.ts                 # Conexión a Icecast
```

---

## MODELO DE DATOS (Prisma Schema)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// MULTI-TENANT: Cada radio es un tenant
// ============================================

model Radio {
  id              String    @id @default(cuid())
  nombre          String
  slug            String    @unique
  ciudad          String
  provincia       String
  pais            String    @default("Argentina")
  logoUrl         String?
  plan            Plan      @default(STARTER)
  fuentesNoticias String[]  // URLs RSS configuradas
  estiloLocucion  String?   // Descripción del estilo de la radio
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  usuarios        Usuario[]
  programas       Programa[]
  anunciantes     Anunciante[]
  vocesAsignadas  RadioVoz[]
}

enum Plan {
  STARTER      // $29/mes - 1 stream, 5 voces, 300 hrs
  PROFESSIONAL // $79/mes - 3 streams, todas las voces, 1000 hrs
  ENTERPRISE   // $149/mes - ilimitado
}

model Usuario {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  nombre    String
  rol       Rol      @default(OPERADOR)
  radioId   String
  radio     Radio    @relation(fields: [radioId], references: [id])
  createdAt DateTime @default(now())
}

enum Rol {
  ADMIN
  OPERADOR
}

// ============================================
// CATÁLOGO DE VOCES
// ============================================

model Voz {
  id              String    @id @default(cuid())
  nombre          String    // "Carlos - Noticiero"
  descripcion     String    // "Voz grave, tono serio y profesional"
  genero          GeneroVoz
  tono            TonoVoz
  idioma          String    @default("es-AR")
  geminiVoiceId   String    // ID de voz en Gemini API
  previewUrl      String?   // URL del audio de preview
  esActiva        Boolean   @default(true)
  esPremium       Boolean   @default(false)
  createdAt       DateTime  @default(now())

  radiosAsignadas RadioVoz[]
  bloques         Bloque[]
}

enum GeneroVoz {
  MASCULINA
  FEMENINA
  NEUTRA
}

enum TonoVoz {
  SERIO        // Para noticias
  CALIDO       // Para entretenimiento
  ENERGETICO   // Para cuñas publicitarias
  AMIGABLE     // Para saludos y transiciones
  FORMAL       // Para informes especiales
}

model RadioVoz {
  id      String @id @default(cuid())
  radioId String
  vozId   String
  alias   String? // Nombre personalizado que le da la radio
  radio   Radio  @relation(fields: [radioId], references: [id])
  voz     Voz    @relation(fields: [vozId], references: [id])

  @@unique([radioId, vozId])
}

// ============================================
// PROGRAMAS Y BLOQUES
// ============================================

model Programa {
  id          String          @id @default(cuid())
  nombre      String          // "Noticiero de la Mañana"
  descripcion String?
  radioId     String
  radio       Radio           @relation(fields: [radioId], references: [id])
  estado      EstadoPrograma  @default(BORRADOR)
  duracionEstimada Int?       // Duración en segundos
  panelUrl    String?         // URL única para OBS
  panelToken  String?         @unique // Token de acceso al panel
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  bloques     Bloque[]
  generaciones Generacion[]
}

enum EstadoPrograma {
  BORRADOR
  GENERANDO
  LISTO
  EN_EMISION
  ARCHIVADO
}

model Bloque {
  id          String      @id @default(cuid())
  programaId  String
  programa    Programa    @relation(fields: [programaId], references: [id], onDelete: Cascade)
  tipo        TipoBloque
  orden       Int         // Posición en el programa
  titulo      String      // "Noticias locales" / "Cuña Pizzería Roma"
  vozId       String?
  voz         Voz?        @relation(fields: [vozId], references: [id])
  
  // Configuración específica por tipo (JSON flexible)
  config      Json?       // Ver detalle abajo
  
  // Contenido generado
  guion       String?     // Texto del guión generado
  audioUrl    String?     // URL del audio generado
  duracion    Int?        // Duración en segundos
  estado      EstadoBloque @default(PENDIENTE)
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

enum TipoBloque {
  INTRO           // Apertura del programa
  NOTICIAS        // Bloque noticiero
  CUNA            // Cuña publicitaria
  ENTRETENIMIENTO // Trivias, horóscopo, clima, etc.
  TRANSICION      // Frase de paso entre bloques
  SALUDO          // Saludos a oyentes
  CIERRE          // Cierre del programa
}

enum EstadoBloque {
  PENDIENTE
  GENERANDO_GUION
  GUION_LISTO
  GENERANDO_AUDIO
  LISTO
  ERROR
}

// ============================================
// CONFIG JSON POR TIPO DE BLOQUE
// ============================================
// 
// NOTICIAS:
// {
//   "cantidadNoticias": 5,
//   "categorias": ["politica", "economia", "deportes", "internacionales"],
//   "fuentesRSS": ["https://...", "https://..."],
//   "enfoque": "local",        // "local" | "nacional" | "internacional"
//   "duracionObjetivo": 180    // segundos
// }
//
// CUNA:
// {
//   "anuncianteId": "clxxx...",
//   "producto": "Pizza Napolitana",
//   "oferta": "2x1 los martes",
//   "telefono": "0800-123-456",
//   "direccion": "Av. Corrientes 1234",
//   "estilo": "energetico",    // "energetico" | "elegante" | "humoristico"
//   "duracionObjetivo": 30     // segundos
// }
//
// ENTRETENIMIENTO:
// {
//   "subtipos": ["efemerides", "clima", "horoscopo", "trivia"],
//   "ciudadClima": "Buenos Aires",
//   "duracionObjetivo": 120
// }
//
// TRANSICION:
// {
//   "bloqueAnterior": "noticias",
//   "bloqueSiguiente": "entretenimiento",
//   "estilo": "natural",       // "natural" | "formal" | "humoristico"
//   "duracionObjetivo": 15
// }
//
// INTRO:
// {
//   "nombrePrograma": "Buenos Días Dejavu",
//   "horario": "mañana",       // "mañana" | "tarde" | "noche"
//   "estilo": "energetico",
//   "duracionObjetivo": 30
// }
//
// CIERRE:
// {
//   "nombrePrograma": "Buenos Días Dejavu",
//   "mensajeDespedida": "custom o auto",
//   "duracionObjetivo": 20
// }
//
// SALUDO:
// {
//   "tipo": "cumpleanos",      // "cumpleanos" | "oyente" | "especial"
//   "nombre": "María",
//   "mensaje": "Feliz cumpleaños desde toda la familia Dejavu",
//   "duracionObjetivo": 15
// }

// ============================================
// ANUNCIANTES
// ============================================

model Anunciante {
  id          String   @id @default(cuid())
  radioId     String
  radio       Radio    @relation(fields: [radioId], references: [id])
  nombre      String   // "Pizzería Roma"
  contacto    String?
  telefono    String?
  email       String?
  direccion   String?
  rubro       String?
  notas       String?
  esActivo    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  cunas       Cuna[]
}

model Cuna {
  id            String   @id @default(cuid())
  anuncianteId  String
  anunciante    Anunciante @relation(fields: [anuncianteId], references: [id])
  producto      String
  oferta        String?
  estilo        String   @default("energetico")
  guion         String?
  audioUrl      String?
  duracion      Int?
  esActiva      Boolean  @default(true)
  createdAt     DateTime @default(now())
}

// ============================================
// GENERACIONES (historial)
// ============================================

model Generacion {
  id          String   @id @default(cuid())
  programaId  String
  programa    Programa @relation(fields: [programaId], references: [id])
  estado      EstadoGeneracion @default(EN_COLA)
  audioFinalUrl String?
  duracionTotal Int?
  costoTokens   Float?  // Costo estimado de la generación
  errorLog      String?
  createdAt     DateTime @default(now())
  completadaAt  DateTime?
}

enum EstadoGeneracion {
  EN_COLA
  PROCESANDO
  COMPLETADA
  ERROR
}
```

---

## FASE 1 — ONBOARDING

### 1.1 Registro de Radio

**Ruta:** `/register`

Formulario de registro con los campos: nombre de la radio, email del admin, contraseña, ciudad/provincia, y selección de plan. Al registrarse se crea la Radio (tenant) y el Usuario admin asociado. Redirige al dashboard.

### 1.2 Configuración del Perfil

**Ruta:** `/configuracion`

Pantalla donde la radio configura:
- **Fuentes de noticias RSS:** Listado predefinido de fuentes argentinas + opción de agregar URLs custom. Fuentes sugeridas por defecto para Argentina:
  - Infobae: `https://www.infobae.com/feeds/rss/`
  - Clarín: `https://www.clarin.com/rss/lo-ultimo/`
  - La Nación: `https://www.lanacion.com.ar/arc/outboundfeeds/rss/`
  - Télam: `https://www.telam.com.ar/rss2/`
  - Ámbito Financiero: `https://www.ambito.com/rss/pages.xml`
  - TyC Sports (deportes): `https://www.tycsports.com/rss.xml`
- **Estilo de locución:** Textarea donde describe cómo quiere que suenen sus locutores (formal, cercano, humorístico, etc.). Esto se inyecta como contexto en todos los prompts de Gemini.
- **Logo:** Upload opcional para branding del panel.

### 1.3 Catálogo de Voces

**Ruta:** `/voces`

Grid de cards con las voces disponibles. Cada card muestra: nombre, descripción del tono, género, y un botón de preview que reproduce un audio de muestra. La radio selecciona qué voces quiere usar y les puede poner un alias (ej: "La voz de las noticias", "El locutor de la tarde").

**Voces iniciales del catálogo** (usar las voces disponibles en Gemini TTS):

| Nombre | Género | Tono | Uso sugerido |
|--------|--------|------|--------------|
| Carlos Noticias | Masculina | Serio | Noticieros |
| Laura Noticias | Femenina | Serio | Noticieros |
| Martín Show | Masculina | Cálido | Entretenimiento |
| Sofía Show | Femenina | Amigable | Entretenimiento |
| Diego Spots | Masculina | Enérgico | Cuñas publicitarias |
| Valentina Spots | Femenina | Enérgico | Cuñas publicitarias |

> **Nota:** Los `geminiVoiceId` dependen de las voces disponibles en la API de Gemini al momento de implementar. Consultar la documentación de Google Gemini TTS para los IDs actuales.

---

## FASE 2 — CREAR PROGRAMA (Editor de Bloques)

### 2.1 Lista de Programas

**Ruta:** `/programas`

Tabla/grid con los programas de la radio. Muestra nombre, estado, cantidad de bloques, duración estimada, fecha de última generación. Botón "Nuevo programa" y acciones por programa (editar, generar, ver panel OBS, archivar).

### 2.2 Editor de Bloques

**Ruta:** `/programas/nuevo` y `/programas/[id]`

**Esta es la pantalla más importante del producto.** Es un editor visual donde el usuario construye la estructura de su programa arrastrando bloques.

**Layout del editor:**

```
┌─────────────────────────────────────────────────────────┐
│  ← Volver    "Noticiero de la Mañana"     [Guardar]    │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  BLOQUES     │         TIMELINE DEL PROGRAMA            │
│  DISPONIBLES │                                          │
│              │  ┌──────┐ ┌────────┐ ┌──────┐ ┌───────┐ │
│  [+ Intro]   │  │Intro │→│Noticias│→│ Cuña │→│Entret.│ │
│  [+ Noticias]│  └──────┘ └────────┘ └──────┘ └───────┘ │
│  [+ Cuña]    │                                          │
│  [+ Entret.] │  Duración estimada: ~15 min              │
│  [+ Transic.]│                                          │
│  [+ Saludo]  │──────────────────────────────────────────│
│  [+ Cierre]  │                                          │
│              │  CONFIGURACIÓN DEL BLOQUE SELECCIONADO   │
│              │                                          │
│              │  Tipo: Noticias                           │
│              │  Voz: [Carlos Noticias ▼]                │
│              │  Cantidad: [5 noticias]                   │
│              │  Categorías: ☑ Política ☑ Economía       │
│              │  Enfoque: [Local ▼]                       │
│              │  Duración: ~3 min                         │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

**Implementación:** Usar `@dnd-kit/core` y `@dnd-kit/sortable` para el drag & drop. Panel izquierdo con los tipos de bloques disponibles (se arrastran al timeline). Panel central con el timeline horizontal de bloques ordenados. Panel inferior con la configuración del bloque seleccionado (formulario dinámico según el tipo).

**Formularios de configuración por tipo de bloque:**

- **Intro:** Nombre del programa, horario, estilo
- **Noticias:** Cantidad, categorías, enfoque (local/nacional), fuentes RSS, duración objetivo
- **Cuña:** Selector de anunciante existente o crear nuevo, producto, oferta, teléfono, estilo
- **Entretenimiento:** Checkboxes de subtipos (efemérides, clima, horóscopo, trivia), ciudad para clima
- **Transición:** Se autoconfigura detectando el bloque anterior y siguiente
- **Saludo:** Tipo (cumpleaños/oyente/especial), nombre, mensaje
- **Cierre:** Mensaje de despedida (auto o custom)

**Cada bloque en el timeline muestra:** Ícono del tipo, título, voz asignada, duración estimada, estado (pendiente/generado), y botón para eliminar.

---

## FASE 3 — GENERAR CONTENIDO

### 3.1 Flujo de Generación

```
1. Frontend llama POST /api/programas/[id]/generar
2. API crea un registro en Generacion con estado EN_COLA
3. API encola un job en Redis (Bull queue) para cada bloque
4. Worker procesa cada bloque en orden:
   a. Genera el guión con Gemini (texto)
   b. Guarda el guión en el bloque
   c. Genera el audio con Gemini TTS
   d. Guarda el audio en storage
   e. Actualiza estado del bloque
5. Cuando todos los bloques están listos:
   a. FFmpeg ensambla todos los audios en orden
   b. Guarda el audio final
   c. Actualiza la Generacion como COMPLETADA
6. Frontend recibe actualizaciones via polling o SSE
```

### 3.2 Generación de Guiones (Prompts de Gemini)

> **IMPORTANTE:** Todos los prompts deben recibir el `estiloLocucion` configurado por la radio para mantener consistencia.

#### Prompt para NOTICIAS

```typescript
// src/lib/gemini/prompts/noticias.ts

export function buildNoticiasPrompt(config: {
  noticias: string[];
  cantidadNoticias: number;
  enfoque: 'local' | 'nacional' | 'internacional';
  estiloRadio: string;
  nombrePrograma: string;
  ciudadRadio: string;
}): string {
  return `
Eres un redactor de noticias para radio. Escribe un guión de noticiero radial.

CONTEXTO:
- Radio: ubicada en ${config.ciudadRadio}, Argentina
- Programa: "${config.nombrePrograma}"
- Estilo de la radio: ${config.estiloRadio}
- Enfoque: ${config.enfoque}

NOTICIAS DISPONIBLES (selecciona las ${config.cantidadNoticias} más relevantes):
${config.noticias.map((n, i) => `${i + 1}. ${n}`).join('\n')}

REGLAS:
- Escribe en español argentino natural, como habla un locutor real
- Cada noticia debe tener: titular breve, desarrollo de 2-3 oraciones, y transición a la siguiente
- Usa conectores naturales entre noticias ("Pasando a otro tema...", "En el ámbito deportivo...", "Y en lo que respecta a...")
- NO uses markdown, asteriscos, ni formato especial. Solo texto plano que será leído en voz alta
- Duración estimada: ${config.cantidadNoticias * 30} segundos (aproximadamente ${config.cantidadNoticias * 50} palabras)
- Incluye una frase de apertura del bloque y una de cierre

Escribe SOLO el guión, sin indicaciones de dirección ni acotaciones.
`;
}
```

#### Prompt para CUÑAS PUBLICITARIAS

```typescript
// src/lib/gemini/prompts/cunas.ts

export function buildCunaPrompt(config: {
  anunciante: string;
  producto: string;
  oferta?: string;
  telefono?: string;
  direccion?: string;
  estilo: 'energetico' | 'elegante' | 'humoristico';
  duracionObjetivo: number;
  estiloRadio: string;
}): string {
  return `
Eres un creativo publicitario para radio. Escribe una cuña radial (spot publicitario).

DATOS DEL ANUNCIANTE:
- Negocio: ${config.anunciante}
- Producto/servicio: ${config.producto}
${config.oferta ? `- Oferta: ${config.oferta}` : ''}
${config.telefono ? `- Teléfono: ${config.telefono}` : ''}
${config.direccion ? `- Dirección: ${config.direccion}` : ''}

ESTILO: ${config.estilo}
ESTILO GENERAL DE LA RADIO: ${config.estiloRadio}
DURACIÓN OBJETIVO: ${config.duracionObjetivo} segundos (~${Math.round(config.duracionObjetivo * 2.5)} palabras)

REGLAS:
- Escribe en español argentino, natural y persuasivo
- Debe tener un hook de apertura que capte atención
- Mencionar el nombre del negocio al menos 2 veces
- Si hay oferta, resaltarla claramente
- Cerrar con datos de contacto o dirección
- NO uses markdown ni formato especial. Solo texto plano para ser leído en voz alta

Escribe SOLO la cuña, sin indicaciones de dirección.
`;
}
```

#### Prompt para ENTRETENIMIENTO

```typescript
// src/lib/gemini/prompts/entretenimiento.ts

export function buildEntretenimientoPrompt(config: {
  subtipos: ('efemerides' | 'clima' | 'horoscopo' | 'trivia')[];
  ciudadClima?: string;
  datosClima?: string;
  fechaHoy: string;
  estiloRadio: string;
  nombrePrograma: string;
}): string {
  return `
Eres un locutor de radio creando un segmento de entretenimiento.

CONTEXTO:
- Programa: "${config.nombrePrograma}"
- Fecha: ${config.fechaHoy}
- Estilo de la radio: ${config.estiloRadio}
${config.ciudadClima ? `- Ciudad para clima: ${config.ciudadClima}` : ''}
${config.datosClima ? `- Datos del clima: ${config.datosClima}` : ''}

SECCIONES A INCLUIR: ${config.subtipos.join(', ')}

INSTRUCCIONES POR SECCIÓN:
${config.subtipos.includes('efemerides') ? '- EFEMÉRIDES: Menciona 2-3 eventos históricos importantes de esta fecha. Hazlo interesante y breve.' : ''}
${config.subtipos.includes('clima') ? '- CLIMA: Da el pronóstico del día de forma conversacional, con temperatura y condiciones.' : ''}
${config.subtipos.includes('horoscopo') ? '- HORÓSCOPO: Elige 3-4 signos al azar y da un horóscopo breve, positivo y divertido para cada uno.' : ''}
${config.subtipos.includes('trivia') ? '- TRIVIA: Incluye una pregunta de trivia con la respuesta. Hazla interesante y sorprendente.' : ''}

REGLAS:
- Español argentino natural, tono amigable y entretenido
- Usa transiciones naturales entre secciones
- NO uses markdown ni formato. Solo texto plano para ser leído en voz alta
- Duración total: aproximadamente ${config.subtipos.length * 40} segundos

Escribe SOLO el guión sin acotaciones.
`;
}
```

#### Prompt para TRANSICIONES

```typescript
// src/lib/gemini/prompts/transiciones.ts

export function buildTransicionPrompt(config: {
  bloqueAnterior: string;
  bloqueSiguiente: string;
  estilo: 'natural' | 'formal' | 'humoristico';
  nombrePrograma: string;
  estiloRadio: string;
}): string {
  return `
Escribe una frase de transición radial breve (1-2 oraciones) para pasar del segmento de "${config.bloqueAnterior}" al segmento de "${config.bloqueSiguiente}".

Programa: "${config.nombrePrograma}"
Estilo: ${config.estilo}
Estilo de la radio: ${config.estiloRadio}

La frase debe ser natural, como la diría un locutor real. NO uses markdown. Solo texto plano.
Máximo 30 palabras.
`;
}
```

#### Prompt para INTRO

```typescript
// src/lib/gemini/prompts/intro.ts

export function buildIntroPrompt(config: {
  nombrePrograma: string;
  horario: 'mañana' | 'tarde' | 'noche';
  estilo: string;
  estiloRadio: string;
  nombreRadio: string;
}): string {
  return `
Escribe una apertura de programa de radio. Breve y con energía.

- Radio: ${config.nombreRadio}
- Programa: "${config.nombrePrograma}"
- Horario: ${config.horario}
- Estilo: ${config.estilo}
- Estilo de la radio: ${config.estiloRadio}

Incluye saludo, nombre del programa y una frase que enganche al oyente.
Español argentino natural. Solo texto plano, sin markdown. Máximo 50 palabras.
`;
}
```

#### Prompt para CIERRE

```typescript
// src/lib/gemini/prompts/cierre.ts

export function buildCierrePrompt(config: {
  nombrePrograma: string;
  nombreRadio: string;
  mensajeDespedida?: string;
  estiloRadio: string;
}): string {
  return `
Escribe un cierre de programa de radio. Cálido y breve.

- Radio: ${config.nombreRadio}
- Programa: "${config.nombrePrograma}"
- Estilo de la radio: ${config.estiloRadio}
${config.mensajeDespedida ? `- Mensaje especial: ${config.mensajeDespedida}` : ''}

Incluye agradecimiento a los oyentes, nombre de la radio y una frase de despedida.
Español argentino natural. Solo texto plano, sin markdown. Máximo 40 palabras.
`;
}
```

### 3.3 Generación de Audio (Gemini TTS)

```typescript
// src/lib/gemini/tts.ts

import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generarAudio(params: {
  texto: string;
  vozId: string;
  outputPath: string;
}): Promise<{ duracion: number; path: string }> {
  
  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text: params.texto }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: params.vozId,
          }
        }
      }
    }
  });

  const audioData = response.candidates[0].content.parts[0].inlineData;
  const audioBuffer = Buffer.from(audioData.data, 'base64');
  
  const fs = require('fs').promises;
  await fs.writeFile(params.outputPath, audioBuffer);

  const duracion = await getAudioDuration(params.outputPath);

  return { duracion, path: params.outputPath };
}
```

> **NOTA:** La API de Gemini TTS puede cambiar. Verificar el modelo TTS correcto disponible en la documentación actual de Google Gemini al momento de implementar.

### 3.4 Ensamblaje con FFmpeg

```typescript
// src/lib/audio/ensamblar.ts

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function ensamblarPrograma(params: {
  bloques: { audioPath: string; orden: number }[];
  outputPath: string;
  silencioEntreBloquesMs?: number;
}): Promise<{ duracionTotal: number; path: string }> {
  
  const silencio = params.silencioEntreBloquesMs || 500;
  const bloquesOrdenados = params.bloques.sort((a, b) => a.orden - b.orden);
  const fs = require('fs').promises;

  // Normalizar todos los audios al mismo formato
  const normalizedPaths: string[] = [];
  for (const bloque of bloquesOrdenados) {
    const normalizedPath = `${bloque.audioPath}.normalized.wav`;
    await execAsync(
      `ffmpeg -y -i "${bloque.audioPath}" -ar 44100 -ac 1 -acodec pcm_s16le "${normalizedPath}"`
    );
    normalizedPaths.push(normalizedPath);
  }

  // Generar silencio entre bloques
  const silencioPath = `${params.outputPath}.silence.wav`;
  await execAsync(
    `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${silencio / 1000} -acodec pcm_s16le "${silencioPath}"`
  );

  // Crear lista intercalada con silencios
  const finalList = normalizedPaths
    .flatMap((path, i) => 
      i < normalizedPaths.length - 1 
        ? [`file '${path}'`, `file '${silencioPath}'`]
        : [`file '${path}'`]
    )
    .join('\n');
  
  const finalListPath = `${params.outputPath}.final.txt`;
  await fs.writeFile(finalListPath, finalList);

  await execAsync(
    `ffmpeg -y -f concat -safe 0 -i "${finalListPath}" -acodec libmp3lame -ab 128k "${params.outputPath}"`
  );

  const duracionTotal = await getAudioDuration(params.outputPath);

  await Promise.all([
    fs.unlink(finalListPath).catch(() => {}),
    fs.unlink(silencioPath).catch(() => {}),
    ...normalizedPaths.map(p => fs.unlink(p).catch(() => {}))
  ]);

  return { duracionTotal, path: params.outputPath };
}

async function getAudioDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
  );
  return Math.round(parseFloat(stdout.trim()));
}
```

### 3.5 Worker de Procesamiento

```typescript
// worker/index.ts

import Bull from 'bull';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const generacionQueue = new Bull('generacion', {
  redis: { host: 'redis', port: 6379 }
});

generacionQueue.process('generar-programa', async (job) => {
  const { programaId, generacionId } = job.data;
  
  try {
    const programa = await prisma.programa.findUnique({
      where: { id: programaId },
      include: { 
        bloques: { orderBy: { orden: 'asc' } },
        radio: true
      }
    });

    await prisma.generacion.update({
      where: { id: generacionId },
      data: { estado: 'PROCESANDO' }
    });

    for (const bloque of programa.bloques) {
      await prisma.bloque.update({
        where: { id: bloque.id },
        data: { estado: 'GENERANDO_GUION' }
      });

      const guion = await generarGuionPorTipo(bloque, programa);
      
      await prisma.bloque.update({
        where: { id: bloque.id },
        data: { guion, estado: 'GUION_LISTO' }
      });

      await prisma.bloque.update({
        where: { id: bloque.id },
        data: { estado: 'GENERANDO_AUDIO' }
      });

      const audioResult = await generarAudio({
        texto: guion,
        vozId: bloque.voz?.geminiVoiceId || 'default-voice',
        outputPath: `/app/storage/audio/${programa.radioId}/${programaId}/${bloque.id}.wav`
      });

      await prisma.bloque.update({
        where: { id: bloque.id },
        data: { 
          audioUrl: audioResult.path,
          duracion: audioResult.duracion,
          estado: 'LISTO'
        }
      });

      job.progress(
        Math.round((programa.bloques.indexOf(bloque) + 1) / programa.bloques.length * 100)
      );
    }

    const bloquesConAudio = await prisma.bloque.findMany({
      where: { programaId, estado: 'LISTO' },
      orderBy: { orden: 'asc' }
    });

    const resultado = await ensamblarPrograma({
      bloques: bloquesConAudio.map(b => ({
        audioPath: b.audioUrl!,
        orden: b.orden
      })),
      outputPath: `/app/storage/audio/${programa.radioId}/${programaId}/programa_final.mp3`
    });

    await prisma.generacion.update({
      where: { id: generacionId },
      data: {
        estado: 'COMPLETADA',
        audioFinalUrl: resultado.path,
        duracionTotal: resultado.duracionTotal,
        completadaAt: new Date()
      }
    });

    await prisma.programa.update({
      where: { id: programaId },
      data: { 
        estado: 'LISTO',
        duracionEstimada: resultado.duracionTotal
      }
    });

  } catch (error) {
    await prisma.generacion.update({
      where: { id: generacionId },
      data: { estado: 'ERROR', errorLog: error.message }
    });
    throw error;
  }
});
```

### 3.6 Fetch de Noticias (RSS)

```typescript
// src/lib/noticias/rss.ts

import Parser from 'rss-parser';

const parser = new Parser();

export async function fetchNoticias(params: {
  fuentesRSS: string[];
  cantidad: number;
  categorias?: string[];
}): Promise<string[]> {
  
  const todasLasNoticias: { titulo: string; resumen: string; fecha: Date }[] = [];

  for (const url of params.fuentesRSS) {
    try {
      const feed = await parser.parseURL(url);
      for (const item of feed.items.slice(0, 10)) {
        todasLasNoticias.push({
          titulo: item.title || '',
          resumen: item.contentSnippet || item.content || '',
          fecha: new Date(item.pubDate || Date.now())
        });
      }
    } catch (error) {
      console.error(`Error fetching RSS ${url}:`, error.message);
    }
  }

  return todasLasNoticias
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
    .slice(0, params.cantidad)
    .map(n => `${n.titulo}: ${n.resumen}`);
}
```

### 3.7 Clima (Open-Meteo)

```typescript
// src/lib/entretenimiento/clima.ts

// API gratuita de Open-Meteo — no requiere API key
export async function fetchClima(ciudad: string): Promise<string> {
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1&language=es`
  );
  const geoData = await geoRes.json();
  const { latitude, longitude } = geoData.results[0];

  const climaRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=America/Argentina/Buenos_Aires`
  );
  const climaData = await climaRes.json();

  return JSON.stringify({
    temperatura: climaData.current.temperature_2m,
    maxima: climaData.daily.temperature_2m_max[0],
    minima: climaData.daily.temperature_2m_min[0],
    condicion: weatherCodeToText(climaData.current.weather_code)
  });
}
```

---

## FASE 4 — PANEL DE EMISIÓN (OBS)

### 4.1 Panel de Reproducción

**Ruta:** `/panel/[programaId]`

Página standalone sin sidebar ni header. Solo el panel de audio. OBS consume esta URL como fuente de navegador.

**Diseño del panel:**

```
┌──────────────────────────────────────────────┐
│  🔴 RadioFlow    "Noticiero de la Mañana"    │
├──────────────────────────────────────────────┤
│                                              │
│  ▶ [INTRO]           00:28   ██████████ ✓   │
│  ▶ [NOTICIAS]        03:15   ██████████     │
│  ▶ [CUÑA - Roma]     00:30   ██████████     │
│  ▶ [ENTRETENIMIENTO] 02:10   ██████████     │
│  ▶ [TRANSICIÓN]      00:12   ██████████     │
│  ▶ [CIERRE]          00:22   ██████████     │
│                                              │
│  ──────────────────────────────────────────  │
│  [▶ PLAY TODO]  [⏭ SIGUIENTE]  [⏹ STOP]    │
│                                              │
│  Duración total: 06:57                       │
│                                              │
└──────────────────────────────────────────────┘
```

**Funcionalidades:**

1. **Play individual:** Click en un bloque reproduce solo ese audio
2. **Play todo:** Reproduce todos los bloques en secuencia
3. **Siguiente:** Salta al próximo bloque
4. **Stop:** Detiene la reproducción
5. **Indicador visual:** Muestra qué bloque se está reproduciendo y el progreso
6. **Auto-siguiente:** Al terminar un bloque pasa al siguiente (pausa configurable 0.5–2s)

**Notas de implementación:**

- Usar la Web Audio API nativa del navegador
- Precargar todos los audios al montar el componente
- No usar controles nativos de `<audio>` (diseño custom)
- Acceso con token único por programa
- Background oscuro para que OBS lo capture bien
- Sin animaciones pesadas (consume CPU del streamer)

**Acceso al panel:**

```
/panel/[programaId]?token=[panelToken]
```

### 4.2 Configuración en OBS

1. En OBS, agregar fuente → "Navegador"
2. Pegar la URL del panel
3. Activar "Controlar audio vía OBS"
4. En el mezclador de OBS, ajustar volumen de la fuente "RadioFlow"
5. Agregar otra fuente para música (VLC, Spotify, archivos locales)
6. El operador controla cuándo suena cada cosa desde OBS

---

## FASE 5 — DASHBOARD DE GESTIÓN

### 5.1 Dashboard Principal (`/dashboard`)

Cards con métricas: programas activos, horas generadas este mes, cuñas activas, última generación. Lista rápida de programas recientes con accesos directos.

### 5.2 Gestión de Anunciantes (`/anunciantes`)

CRUD completo de anunciantes con cuñas asociadas. Crear/editar anunciantes, crear cuñas, ver historial y regenerar cuñas con diferentes parámetros.

### 5.3 Analytics (`/analytics`)

- Horas de audio generadas (por día/semana/mes)
- Programas generados
- Bloques por tipo
- Costo estimado de API (tokens consumidos)
- Límites del plan actual y porcentaje de uso

---

## SEGURIDAD Y MULTI-TENANCY

### Reglas de aislamiento

1. **Toda query a la base de datos DEBE filtrar por `radioId`** del usuario autenticado
2. **Middleware de autenticación** en todas las rutas de API y páginas del dashboard
3. **El panel OBS se autentica por token**, no por sesión
4. **Los archivos de audio se organizan por `radioId`**: `/storage/audio/[radioId]/[programaId]/`
5. **Rate limiting** por radio según el plan contratado

```typescript
// src/middleware.ts
// Cada request autenticado debe:
// 1. Verificar sesión con NextAuth
// 2. Obtener el radioId del usuario
// 3. Inyectar radioId en el contexto
// Excepción: /panel/[id]?token=xxx usa autenticación por token
```

---

## VARIABLES DE ENTORNO (.env.local)

```env
# Base de datos
DATABASE_URL=postgresql://radioflow:radioflow@localhost:5432/radioflow

# Redis
REDIS_URL=redis://localhost:6379

# Gemini API
GEMINI_API_KEY=tu_api_key_aqui

# NextAuth
NEXTAUTH_SECRET=un_secret_random_largo
NEXTAUTH_URL=http://localhost:3000

# Icecast (para streaming futuro)
ICECAST_HOST=localhost
ICECAST_PORT=8000
ICECAST_SOURCE_PASSWORD=radioflow_source

# Audio storage
AUDIO_STORAGE_PATH=./storage/audio
```

---

## ORDEN DE IMPLEMENTACIÓN (Sprints)

### Sprint 1 — Fundación (Días 1–3)
- [ ] Setup Docker (docker-compose.yml con todos los servicios)
- [ ] Setup Next.js con App Router
- [ ] Configurar Prisma con el schema completo
- [ ] Configurar NextAuth (registro + login)
- [ ] Layout del dashboard con sidebar
- [ ] CRUD de Radio (registro + configuración)

### Sprint 2 — Voces y Editor (Días 4–6)
- [ ] Seed de voces en la base de datos
- [ ] Página de catálogo de voces con preview
- [ ] CRUD de programas
- [ ] Editor de bloques con drag & drop (@dnd-kit)
- [ ] Formularios de configuración por tipo de bloque
- [ ] CRUD de anunciantes

### Sprint 3 — Generación IA (Días 7–10)
- [ ] Integración con Gemini API (texto)
- [ ] Implementar todos los prompts de guiones
- [ ] Integración con Gemini TTS
- [ ] Worker con Bull queue para procesamiento
- [ ] Fetch de noticias RSS
- [ ] Fetch de clima (Open-Meteo)
- [ ] Flujo completo de generación: guión → audio → ensamblaje
- [ ] FFmpeg ensamblaje de programa

### Sprint 4 — Panel OBS y Pulido (Días 11–14)
- [ ] Panel de reproducción standalone
- [ ] Web Audio API para reproducción
- [ ] Sistema de tokens para acceso al panel
- [ ] Página de analytics básica
- [ ] Documentación de configuración OBS
- [ ] Testing end-to-end del flujo completo
- [ ] Manejo de errores y estados de loading

---

## DEPENDENCIAS NPM

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@prisma/client": "^5.0.0",
    "prisma": "^5.0.0",
    "next-auth": "^4.24.0",
    "@google/genai": "latest",
    "bullmq": "^5.0.0",
    "ioredis": "^5.0.0",
    "rss-parser": "^3.13.0",
    "@dnd-kit/core": "^6.0.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.0.0",
    "bcryptjs": "^2.4.3",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.300.0",
    "zod": "^3.22.0",
    "zustand": "^4.4.0"
  }
}
```

---

## NOTAS PARA EL DESARROLLADOR

1. **Gemini API:** La API de Google Gemini cambia frecuentemente. Verificar la documentación actual para los modelos TTS disponibles y sus voice IDs. El código de TTS es referencial.

2. **FFmpeg:** Debe estar instalado en los containers Docker. Agregar al Dockerfile:
   ```dockerfile
   RUN apt-get update && apt-get install -y ffmpeg
   ```

3. **Icecast:** Para el MVP el panel OBS usa audio directo del navegador (Web Audio API). Icecast se usará en fase futura para streaming real.

4. **Multi-tenancy (CRÍTICO):** Toda operación debe filtrar por `radioId`. Nunca exponer datos de una radio a otra. Crear un helper `getRadioId(session)` y usarlo en todas las queries.

5. **Manejo de errores:** Cada paso de la generación puede fallar (RSS no disponible, Gemini rate limited, FFmpeg error). El worker debe manejar cada error individualmente y marcar el bloque/generación con estado ERROR y el log correspondiente.

6. **Progreso en tiempo real:** Implementar polling cada 2 segundos durante la generación. Alternativa mejor: Server-Sent Events (SSE) desde el worker.

7. **Audio storage:** En desarrollo local usar el volumen Docker. En producción migrar a S3/GCS. Abstraer con la capa `storage.ts`.

8. **Seed de prueba (Radio Dejavu):** Crear un seed script que precargue la radio "Dejavu" (Argentina) con configuración de ejemplo para facilitar el desarrollo y pruebas.
