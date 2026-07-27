# Feature: Catálogo de audios generados con IA
> Status: DONE
> v1 | 2026-07-23

## Why
Hoy los audios que genera la IA (presentaciones DJ, intros, publicidades, etc.) quedan como archivos opacos en disco o en flujos sueltos: no hay un lugar para escucharlos, entender a qué refieren, ni descargarlos con un nombre legible con fecha.

## Files

### Create
- `src/app/(dashboard)/audios/generados/page.tsx` — página del catálogo de audios generados con IA
- `src/components/audios/AudiosGeneradosCatalogo.tsx` — listado con filtros, preview y descarga
- `src/components/audios/AudioGeneradoCard.tsx` — fila/tarjeta: título, tipo, contexto, play, descarga
- `src/app/api/audios/generados/route.ts` — GET listado unificado de audios IA del tenant
- `src/app/api/audios/generados/[id]/route.ts` — GET stream/descarga de un ítem del catálogo (query `?download=1` fuerza Content-Disposition)
- `src/lib/audios/catalogoGenerados.ts` — agrega fuentes (presentaciones, intros, transiciones, publicidad) a un listado tipado
- `src/lib/audios/nombreDescarga.ts` — construye nombre amigable `{Tipo}_{Titulo}_{YYYY-MM-DD}.mp3`

### Modify
- `src/components/audios/AudiosBiblioteca.tsx` — enlace/tabs hacia "Generados" sin mezclar con carpetas subidas
- `src/app/(dashboard)/audios/page.tsx` — navegación secundaria Biblioteca | Generados
- `src/lib/dashboard/navLinks.ts` — si hace falta, mantener un solo ítem "Audios" (la subruta vive bajo `/audios`)
- `src/components/publicidad/DemoPublicidadPanel.tsx` — al generar/descargar, usar el helper de nombre amigable con fecha
- `src/types/storage.ts` / `src/lib/audio/storageFormat.ts` — solo si el catálogo necesita etiquetar categorías nuevas; no cambiar la limpieza de disco

### Delete
- (ninguno)

## Contracts

```typescript
type TipoAudioGenerado =
  | "PRESENTACION"
  | "INTRO_APERTURA"
  | "TRANSICION_SLOT"
  | "PUBLICIDAD"
  | "DEMO_PUBLICIDAD";

type AudioGeneradoItem = {
  id: string;                 // id estable del recurso (presentacionId, anuncianteId, etc.)
  tipo: TipoAudioGenerado;
  titulo: string;             // nombre legible (tema, comercio, slot…)
  contexto: string;           // a qué refiere: artista · playlist · slot · guion corto
  creadoEn: string;           // ISO datetime
  duracionSec: number | null;
  tieneAudio: boolean;
  streamUrl: string;          // GET /api/audios/generados/{id}?tipo=…
  nombreDescarga: string;     // ej. Presentacion_Bohemian-Rhapsody_2026-07-23.mp3
};

// GET /api/audios/generados
// query opcional: ?tipo=PRESENTACION|INTRO_APERTURA|…&q=texto
// → 200 { items: AudioGeneradoItem[] }  (más recientes primero)

// GET /api/audios/generados/[id]?tipo=PRESENTACION
// → 200 audio/mpeg (stream). Con ?download=1 → Content-Disposition: attachment; filename="…"
// → 404 si no existe o no pertenece al radioId de la sesión

// nombreDescarga (contrato de formato)
// {TipoEtiqueta}_{TituloSlug}_{YYYY-MM-DD}.mp3
// - TipoEtiqueta: Presentacion | Intro | Transicion | Publicidad | Demo-Publicidad
// - TituloSlug: alfanumérico + guiones, sin espacios ni caracteres raros, máx. ~60 chars
// - Fecha: día de creación del audio (timezone de la radio si existe; si no, America/Argentina/Buenos_Aires)
// - Si dos ítems del mismo tipo+título+día colisionan en nombre, sufijo _HHmm
```

## Behavior

- En `/audios` hay dos vistas: **Biblioteca** (carpetas subidas, feature 045) y **Generados** (`/audios/generados`).
- La vista Generados lista todos los audios generados por IA del tenant, con tipo, título, contexto (a qué hacen referencia) y fecha.
- El usuario puede filtrar por tipo y buscar por texto (título / contexto).
- Cada ítem con audio tiene play/pause inline (un solo reproductor activo a la vez) y botón Descargar.
- La descarga usa el nombre amigable del contrato (`nombreDescarga`), no el path interno ni el cuid.
- En el panel demo de publicidad, al generar con auto-download o al pulsar Descargar, el archivo también usa el mismo formato con fecha (ej. `Demo-Publicidad_Farmacia-Central_2026-07-23.mp3`).
- Solo se listan ítems del `radioId` de la sesión; sin sesión → 401 en las APIs.
- Ítems sin archivo en disco aparecen en el listado con `tieneAudio: false` y sin play/descarga (o deshabilitados), para no ocultar el contexto.
- No se mezclan archivos de la biblioteca manual (`AudioArchivo`) en este catálogo.
- No se borran ni regeneran audios desde esta pantalla (eso sigue en Almacenamiento / flujos de origen).

## Notes

- Producto post-040 es DJ-céntrico: el catálogo prioriza presentaciones Spotify, intro de apertura, transición de slot y publicidad TTS. No reintroducir UI de programas/bloques salvo que aún existan archivos referenciados en BD y se quiera incluirlos en una iteración posterior.
- Las interrupciones DJ efímeras (hora/clima/texto generadas al vuelo y no persistidas) **no** entran en v1; si más adelante se cachean en disco, se puede ampliar `TipoAudioGenerado`.
- `/almacenamiento` sigue siendo limpieza por categoría de disco; este catálogo es de consumo (escuchar + entender + descargar).
- El `id` de la API de stream debe ir acompañado de `tipo` porque los cuid de distintas tablas pueden colisionar en forma.
- Reutilizar rutas de stream existentes por debajo está bien, pero la descarga amigable debe pasar por el endpoint unificado (o setear `Content-Disposition` / `download` attribute con `nombreDescarga`).

## AC

- [x] Desde `/audios` se puede abrir la vista **Generados** y ver el listado del tenant
- [x] Cada ítem muestra tipo, título, contexto (a qué refiere) y fecha
- [x] Play reproduce el audio; al reproducir otro, el anterior se detiene
- [x] Descargar guarda un archivo con nombre `Tipo_Titulo_YYYY-MM-DD.mp3` (no un cuid)
- [x] El filtro por tipo y la búsqueda por texto reducen el listado correctamente
- [x] Demo publicidad descarga con el mismo formato de nombre con fecha
- [x] Un usuario de otra radio no ve ni puede streamear audios ajenos (404/lista vacía)
- [x] Sin sesión, `GET /api/audios/generados` responde 401
- [x] La biblioteca de carpetas subidas (`/audios`) no incluye ni mezcla estos ítems IA

## Changelog
- v1 (2026-07-23): Spec inicial — catálogo de audios IA con preview, contexto y nombres de descarga amigables con fecha
