# Feature: Biblioteca de audios y reproducción desde grilla
> Status: DONE
> v1 | 2026-07-23

## Why
La radio necesita subir jingles/ids/cortinas pregrabadas y programar desde la grilla que una carpeta de esos audios se inserte en el aire cada X minutos, sin depender de OBS ni de publicidad.

## Files

### Create
- `src/app/(dashboard)/audios/page.tsx` — página de biblioteca: carpetas y archivos
- `src/components/audios/AudiosBiblioteca.tsx` — UI de gestión de carpetas y upload
- `src/components/audios/CarpetaAudiosCard.tsx` — tarjeta de carpeta con lista de archivos y acciones
- `src/app/api/audios/carpetas/route.ts` — GET listado / POST crear carpeta
- `src/app/api/audios/carpetas/[id]/route.ts` — PATCH renombrar / DELETE carpeta
- `src/app/api/audios/carpetas/[id]/archivos/route.ts` — GET listado / POST upload multipart
- `src/app/api/audios/archivos/[id]/route.ts` — PATCH (nombre/orden) / DELETE archivo
- `src/app/api/aire/dj-interrupcion/audios/route.ts` — GET lista de archivos activos de la carpeta del slot (token aire)
- `src/app/api/aire/audio-biblioteca/[id]/route.ts` — GET stream de un AudioArchivo (token aire)
- `src/lib/audios/storage.ts` — paths de storage por radioId/carpetaId
- `src/lib/audios/rotacion.ts` — round-robin / random sobre archivos de carpeta

### Modify
- `prisma/schema.prisma` — modelos AudioCarpeta + AudioArchivo; campos DJ audio en SlotGrilla y EventoGrilla
- `src/types/grilla.ts` — TipoInterrupcionDj incluye AUDIO; config de carpeta
- `src/lib/grilla/djConfigSchema.ts` — validación djAudio* + carpetaId
- `src/lib/grilla/mergeDia.ts` — propagar campos audio al SlotHoy
- `src/lib/grilla/interrupcionesProyectadas.ts` — proyectar franjas tipo AUDIO
- `src/lib/aire/djInterrupciones.ts` — timer AUDIO junto a H/C/P
- `src/hooks/useDjInterrupciones.ts` — disparar interrupción AUDIO
- `src/app/api/grilla/slots/route.ts` — persistir campos audio
- `src/app/api/grilla/slots/[id]/route.ts` — idem PATCH
- `src/app/api/grilla/eventos/route.ts` — idem
- `src/app/api/grilla/eventos/[id]/route.ts` — idem
- `src/app/api/aire/estado/route.ts` — incluir config audio + carpetaId en slot activo
- `src/components/grilla/InterruptionConfigCard.tsx` — tipo "audio" + selector de carpeta
- `src/components/grilla/SlotForm.tsx` / `SlotWizardDialog.tsx` — toggle Audio + intervalo + carpeta
- `src/components/grilla/SlotBloque.tsx` — color/franja para AUDIO
- `src/components/dashboard/Sidebar.tsx` — ítem "Audios" en navegación
- `src/components/aire/DjInterrupcionOverlay.tsx` — overlay para tipo AUDIO
- `src/components/aire/ModoDJ.tsx` / `AireController.tsx` — reproducir audio de biblioteca con fade Spotify
- `src/lib/audio/storageGestion.ts` — incluir categoría biblioteca en inventario de disco

## Contracts

```typescript
type ModoRotacionAudio = "SECUENCIAL" | "ALEATORIO";

type AudioCarpeta = {
  id: string;
  radioId: string;
  nombre: string;
  modoRotacion: ModoRotacionAudio;
  esActiva: boolean;
  archivosCount: number;
};

type AudioArchivo = {
  id: string;
  carpetaId: string;
  nombre: string;
  audioUrl: string;
  duracionSec: number | null;
  orden: number;
  esActivo: boolean;
};

type TipoInterrupcionDj = "HORA" | "CLIMA" | "PUBLICIDAD" | "AUDIO";

type DjInterrupcionesConfig = {
  // …campos existentes H/C/P…
  djAudioActiva: boolean;
  djAudioIntervaloMin: number | null;
  djAudioCarpetaId: string | null;
};

// POST /api/audios/carpetas
// body: { nombre: string; modoRotacion?: ModoRotacionAudio }
// → 201 AudioCarpeta

// POST /api/audios/carpetas/[id]/archivos  (multipart/form-data)
// fields: file (audio/mpeg|audio/wav|audio/mp4|audio/x-m4a|audio/ogg), nombre? (string)
// → 201 AudioArchivo
// max 15 MB por archivo

// GET /api/aire/dj-interrupcion/audios?token=&carpetaId=
type DjInterrupcionAudiosResponse = {
  archivos: Array<{ id: string; nombre: string; duracionSec: number | null }>;
  modoRotacion: ModoRotacionAudio;
};

// GET /api/aire/audio-biblioteca/[id]?token=
// → stream audio/mpeg (o content-type del archivo)
```

Prisma:

```prisma
model AudioCarpeta {
  id           String            @id @default(cuid())
  radioId      String
  nombre       String
  modoRotacion ModoRotacionAudio @default(SECUENCIAL)
  esActiva     Boolean           @default(true)
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
  radio        Radio             @relation(fields: [radioId], references: [id], onDelete: Cascade)
  archivos     AudioArchivo[]

  @@index([radioId])
}

model AudioArchivo {
  id          String       @id @default(cuid())
  carpetaId   String
  nombre      String
  audioUrl    String
  duracionSec Int?
  orden       Int          @default(0)
  esActivo    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  carpeta     AudioCarpeta @relation(fields: [carpetaId], references: [id], onDelete: Cascade)

  @@index([carpetaId, orden])
}

enum ModoRotacionAudio {
  SECUENCIAL
  ALEATORIO
}
```

Campos nuevos en `SlotGrilla` y `EventoGrilla`:
- `djAudioActiva Boolean @default(false)`
- `djAudioIntervaloMin Int?`
- `djAudioCarpetaId String?`

## Behavior

- Nueva sección del dashboard **Audios** para crear carpetas (ej. "Jingles", "IDs estación", "Cortinas") y subir MP3/WAV/M4A por carpeta.
- Cada carpeta tiene modo de rotación: secuencial (round-robin) o aleatorio.
- Se puede renombrar/eliminar carpeta; al eliminar, se borran archivos de DB y disco.
- Se puede desactivar un archivo sin borrarlo (`esActivo = false`); no entra en rotación.
- En el wizard/formulario de slot DJ: cuarto toggle **Audios** con intervalo en minutos (mismo rango 5–1440) y selector obligatorio de carpeta activa con al menos un archivo activo.
- Si el toggle Audios está activo sin carpeta o con carpeta vacía, el guardado del slot falla con error claro.
- El calendario proyecta franjas de interrupción tipo AUDIO igual que H/C/P.
- En `/aire`, con slot DJ activo y Audios ON: cada X minutos hace fade de Spotify, reproduce el siguiente archivo de la carpeta configurada, muestra overlay breve (nombre de carpeta o "Audio"), y retoma la música.
- La rotación respeta `modoRotacion` de la carpeta; el índice de secuencia se mantiene en el cliente del panel durante la sesión (igual que publicidad).
- Si la carpeta queda sin archivos activos en runtime, se salta la interrupción sin romper el aire.
- Conflictos con presentación IA en curso: posponer igual que las otras interrupciones.
- Storage en disco: `{AUDIO_STORAGE_PATH}/{radioId}/biblioteca/{carpetaId}/{archivoId}.ext`
- Multi-tenant: toda query filtra por `radioId` de sesión; el stream de aire valida `aireToken` y que el archivo pertenezca a esa radio.

## Notes

- Reutilizar el mismo pipeline de fade/overlay de publicidad (`reproducirInterrupcion`); no inventar un segundo motor de reproducción.
- No mezclar con `Anunciante`: la biblioteca es inventario creativo de la radio (jingles/ids), no clientes pagadores.
- No es bed bajo música: corta Spotify como Hora/Clima/Publicidad. Beds/ducking quedan fuera de este spec.
- Duración del archivo: intentar leerla al subir (ffprobe si está disponible en el entorno); si falla, `duracionSec = null` y el player usa `ended` del HTMLAudioElement.
- Límite 15 MB alineado con cuñas de publicidad existentes si ya hay uno; si no, fijar 15 MB.
- El selector de carpetas en SlotForm debe cargar solo carpetas `esActiva` del tenant con `archivosCount > 0`.

## AC
- [x] Desde /audios se crea una carpeta, se suben ≥2 MP3 y se listan
- [x] Se elimina un archivo y desaparece de disco y de la lista
- [x] Un slot DJ guarda Audios ON + intervalo + carpetaId
- [x] El calendario muestra franjas AUDIO proyectadas
- [x] En /aire, cada X minutos suena un audio de la carpeta (rotación) con fade de Spotify
- [x] Con modo ALEATORIO, no repite el mismo archivo dos veces seguidas si hay ≥2 activos
- [x] Una radio no puede ver ni streamear audios de otra (404)
- [x] Toggle Audios ON sin carpeta válida → error al guardar slot

## Changelog
- v1 (2026-07-23): Initial spec — biblioteca + 4ª interrupción DJ
