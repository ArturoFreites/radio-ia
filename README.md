# Airon

MVP SaaS multi-tenant para crear programas de radio con IA (Gemini), generar audio por bloques con ElevenLabs y emitir desde un panel OBS.

## Stack
- Next.js 16 (App Router) + TypeScript
- PostgreSQL + Prisma
- Redis + BullMQ
- Gemini (`@google/genai`) para guiones
- ElevenLabs API para TTS
- FFmpeg para ensamblaje
- Docker Compose (app, worker, db, redis)

## Variables de entorno
Copiar `.env.example` a `.env.local` y completar:

```bash
cp .env.example .env.local
```

Variables minimas:
- `DATABASE_URL`
- `REDIS_URL`
- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_MODEL_ID` (default: `eleven_turbo_v2_5`)
- `ELEVENLABS_DEFAULT_VOICE_ID` (recomendado: `QK4xDwo9ESPHA4JNUpX3`)
- `ELEVENLABS_OUTPUT_FORMAT` (default: `mp3_44100_128`)
- `NEXTAUTH_SECRET`
- `AUDIO_STORAGE_PATH`

## Desarrollo local
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Worker en paralelo:

```bash
npm run worker
```

## Docker Compose

Primera vez en una máquina nueva:

```bash
cp .env.example .env
# Completar GEMINI_API_KEY, ELEVENLABS_API_KEY y NEXTAUTH_SECRET en .env
docker compose up --build
```

`NEXTAUTH_SECRET` puede generarse con: `openssl rand -base64 32`

Arranque completo (reconstruye imágenes con los últimos cambios):

```bash
docker compose up --build
```

En segundo plano:

```bash
npm run docker:up
```

Forzar rebuild completo tras cambios de UI o rutas (cabina, navbar, etc.):

```bash
npm run docker:rebuild
```

URLs en Docker (puerto 3000):
- Dashboard: `http://localhost:3000/dashboard`
- Cabina (transmisión OBS): `http://localhost:3000/cabina?token=<aireToken>`
- La ruta `/aire` redirige automáticamente a `/cabina`

El token de cabina aparece en **Configuración** del dashboard. El enlace **Cabina** del sidebar lo abre en pestaña nueva.

Variables relevantes en `.env` / `docker-compose.yml`:
- `NEXTAUTH_URL=http://localhost:3000` (debe coincidir con el host desde el que accedés)
- `SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback`

Para omitir el seed en reinicios (DB ya inicializada):

```bash
DOCKER_SKIP_SEED=1 docker compose up --build
```

Inicializacion manual de DB:

```bash
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

## Credenciales seed
- Email: `admin@dejavu.com.ar`
- Password: `dejavu2024`
