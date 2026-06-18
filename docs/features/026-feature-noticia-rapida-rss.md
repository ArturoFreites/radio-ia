# Feature: Noticia rápida desde RSS (one-click)
> Status: DONE
> v1 | 2026-05-26

## Why
El flujo actual de una noticia requiere 7-9 acciones manuales (crear bloque, elegir feed, analizar, seleccionar voz A, voz B, guardar config, generar). Esta feature lo reduce a 2: abrir el feed y elegir un titular.

## Files

### Create
- `src/app/api/programas/[id]/noticias/desde-rss/route.ts` — endpoint que encadena: crear bloque NOTICIA + analizar URL + heredar voces del programa + guardar config + encolar generación

### Modify
- `src/components/editor/BloqueEditor.tsx` — añadir botón "+ Noticia rápida" y lógica del selector RSS one-click
- `src/components/editor/BloqueCard.tsx` — sin cambios de comportamiento, solo debe manejar el estado GENERANDO que llega desde el nuevo endpoint

## Contracts

```ts
// POST /api/programas/[id]/noticias/desde-rss
// Request body
type DesdeRssBody = {
  url: string;           // URL de la noticia elegida del feed
  titulo: string;        // Título del titular (pre-rellena el título del bloque)
  estilo?: "profesional" | "distendido"; // default: "profesional"
};

// Response 201
type DesdeRssResponse = {
  bloque: BloqueEditorItem; // bloque creado, con estado "GENERANDO_GUION"
};

// Response 4xx / 5xx
type DesdeRssError = {
  error: string;
};
```

## Behavior

- El botón "+ Noticia rápida" aparece en la barra de acciones de `BloqueEditor` solo si `tieneFuentesRss` es `true`.
- Al hacer click, abre el mismo panel de titulares RSS que ya existe (reutilizar estado `rssItems`/`rssAbierto` si ya se cargó).
- Al elegir un titular, el cliente llama a `POST /api/programas/[id]/noticias/desde-rss` con `{ url, titulo }`.
- El endpoint en el servidor hace en secuencia:
  1. Crea el bloque NOTICIA con `orden = cantidad_actual_de_bloques`.
  2. Llama a `extraerContenidoNoticia(url)` y guarda el resultado en `config.contenidoNoticiaCache`.
  3. Si el programa tiene `vozPorDefecto` configurada, busca la entrada en `RadioVoz` para obtener `elevenlabsVoiceId` y la asigna al bloque. Para la Voz B (conversación), usa la misma voz por defecto como fallback si no hay una segunda voz configurada en el programa.
  4. Encola la generación (`generar-preview`) de forma interna sin esperar su resolución.
  5. Devuelve el bloque con `estado: "GENERANDO_GUION"`.
- El cliente agrega el bloque a la lista local con estado GENERANDO y arranca el polling existente (mismo que usa `generarPreview` en BloqueCard).
- El botón "+ Noticia rápida" se deshabilita mientras la petición al servidor está en curso.
- El botón "+ Noticia" original (flujo manual con URL) se mantiene sin cambios.

## Notes

- El endpoint debe fallar con 422 si `contenidoNoticiaCache` queda vacío después del scraping (noticia no scrapeada), y en ese caso NO crea el bloque ni encola generación.
- Si el programa no tiene voz por defecto, el bloque se crea sin voces pre-asignadas y queda en estado PENDIENTE (sin lanzar generación). El usuario lo configura manualmente desde el bloque. Esto debe reflejarse en la respuesta con `estado: "PENDIENTE"` y sin encolar nada.
- No alterar el botón "Elegir del feed" dentro del formulario expandido de un bloque NOTICIA existente — ese flujo sigue siendo manual.
- El polling del cliente reutiliza exactamente la misma lógica que `generarPreview` en `BloqueCard` (deadline 180s, polling cada 2s). No duplicar.

## AC
- [ ] Al hacer click en "+ Noticia rápida" se abre el panel de titulares RSS.
- [ ] Al elegir un titular, aparece un nuevo bloque NOTICIA en la lista con badge "GENERANDO" sin ningún paso extra del usuario.
- [ ] Cuando el audio termina de generarse, el badge cambia a "LISTO" y aparece el reproductor en el bloque.
- [ ] Si el scraping no devuelve contenido, no se crea el bloque y se muestra un toast de error.
- [ ] Si el programa no tiene voz configurada, el bloque se crea en estado PENDIENTE y el usuario puede configurar voces manualmente.
- [ ] El botón "+ Noticia" (flujo manual) sigue funcionando igual que antes.

## Changelog
- v1 (2026-05-26): spec inicial
