# Feature: Staff de Locutores — Unificación de Voces y Anunciantes
> Status: DONE
> v1 | 2026-05-26

## Why
Las voces carecen de nombre al aire y personalidad, por lo que los diálogos generados usan etiquetas genéricas (`LOCUTOR_A`) en lugar de los nombres reales de los conductores. Además, Voces y Anunciantes son dos secciones dispersas que conviene unificar en un único módulo de gestión del staff.

## Files

### Create
- `src/app/(dashboard)/locutores/page.tsx` — página del staff con tabs (Locutores / Anunciantes)
- `src/components/dashboard/LocutoresStaff.tsx` — componente cliente con dos tabs
- `src/components/dashboard/AnunciantesManager.tsx` — gestor CRUD de anunciantes y cuñas (extraído de la página actual)
- `prisma/migrations/XXXX_add_locutor_fields/migration.sql` — generada por Cursor con `prisma migrate dev`

### Modify
- `prisma/schema.prisma` — agregar `nombreAlAire` y `personalidad` a `RadioVoz`
- `src/app/(dashboard)/voces/page.tsx` — redirect 307 a `/locutores`
- `src/app/(dashboard)/anunciantes/page.tsx` — redirect 307 a `/locutores?tab=anunciantes`
- `src/components/dashboard/Sidebar.tsx` — reemplazar entradas "Voces" y "Anunciantes" por una sola entrada "Locutores" (`/locutores`)
- `src/components/dashboard/VocesManager.tsx` — agregar campos `nombreAlAire` y `personalidad` al formulario
- `src/app/api/voces/route.ts` — aceptar `nombreAlAire` y `personalidad` en POST
- `src/app/api/voces/[vozId]/route.ts` — aceptar `nombreAlAire` y `personalidad` en PATCH
- `src/lib/gemini/guiones.ts` — `generarGuionPorTipo` acepta `locutorA` y `locutorB`; los pasa a cada prompt builder
- `src/lib/gemini/prompts/intro.ts` — acepta `locutor?: LocutorPromptConfig`
- `src/lib/gemini/prompts/apertura.ts` — acepta `locutor?: LocutorPromptConfig`
- `src/lib/gemini/prompts/cierre.ts` — acepta `locutor?: LocutorPromptConfig`
- `src/lib/gemini/prompts/noticias.ts` — acepta `locutor?: LocutorPromptConfig`
- `src/lib/gemini/prompts/transiciones.ts` — acepta `locutor?: LocutorPromptConfig`
- `src/lib/gemini/prompts/entretenimiento.ts` — acepta `locutor?: LocutorPromptConfig`
- `src/lib/gemini/prompts/cunas.ts` — acepta `locutor?: LocutorPromptConfig`
- `src/lib/gemini/prompts/publicidad.ts` — acepta `locutor?: LocutorPromptConfig`
- `src/lib/gemini/prompts/noticia.ts` — `nombreLocutorA`/`nombreLocutorB` ya existen; agregar `personalidadLocutorA?` y `personalidadLocutorB?`
- `worker/index.ts` — al preparar cada bloque, resuelve `RadioVoz` de las voces asignadas y pasa `locutorA`/`locutorB` a `generarGuionPorTipo`
- `worker/processors/apertura.ts` — recibe y usa `locutor` en el prompt
- `worker/processors/noticia.ts` — recibe y usa `locutorA`/`locutorB` en el prompt; los pasa también a `generarNoticiaPreview`
- `src/lib/spotify/prompts.ts` — usar `voz1Nombre`/`voz2Nombre` y `voz1Personalidad`/`voz2Personalidad` cuando estén disponibles
- `src/lib/spotify/generarPresentacion.ts` — resuelve `RadioVoz` de voz1/voz2 y pasa nombres al prompt
- `src/lib/spotify/generarIntroApertura.ts` — resuelve `RadioVoz` de voz1/voz2 y pasa nombres al prompt

### Delete
_(ninguno — las rutas antiguas redirigen)_

## Contracts

```ts
// Extensión del modelo RadioVoz (schema.prisma)
// model RadioVoz {
//   ...
//   nombreAlAire  String?   // nombre visible al aire, ej: "Carlos", "María"
//   personalidad  String?   // descripción de carácter para prompts, ej: "voz grave, tono irónico, especializado en deportes"
// }

// Payload de POST/PATCH /api/voces
type VozPayload = {
  nombre: string;
  eventlabsVoiceId: string;
  descripcion?: string;
  genero: GeneroVoz;
  tono: TonoVoz;
  nombreAlAire?: string;
  personalidad?: string;
};

// Tipo compartido entre todos los prompt builders
type LocutorPromptConfig = {
  nombre: string;        // fallback: "LOCUTOR_A" / "el locutor"
  personalidad?: string; // si está definida, se agrega al prompt
};

// Nuevo parámetro en generarGuionPorTipo
type GuionInput = {
  // campos existentes...
  locutorA?: LocutorPromptConfig; // voz primaria del bloque
  locutorB?: LocutorPromptConfig; // segunda voz (solo para NOTICIA)
};
```

## Behavior

- La página `/locutores` muestra dos tabs: **Locutores** y **Anunciantes**.
- Tab activo por defecto: Locutores. Si la URL lleva `?tab=anunciantes`, abre ese tab.
- `/voces` redirige a `/locutores` (307). `/anunciantes` redirige a `/locutores?tab=anunciantes` (307).
- El sidebar reemplaza las dos entradas existentes ("Voces", "Anunciantes") por una sola: **Locutores** con ícono `UsersRound` de lucide-react.

### Tab Locutores
- El formulario de alta/edición agrega dos campos nuevos opcionales:
  - **Nombre al aire** (`nombreAlAire`): texto corto, ej. "Carlos". Placeholder: "Nombre al aire (ej: Carlos)".
  - **Personalidad** (`personalidad`): textarea, ej. "Voz grave, tono irónico, habla de deportes". Placeholder: "Describe el carácter de este locutor para la IA".
- La tarjeta de cada voz muestra `nombreAlAire` si está definido (en negrita debajo del nombre técnico) y un resumen de `personalidad` truncado a 60 caracteres.

### Tab Anunciantes
- Muestra el listado de anunciantes actuales con nombre, rubro y estado activo.
- Permite crear, editar y marcar como inactivo un anunciante (CRUD completo, sin cambiar el modelo `Anunciante`).
- Las cuñas (`Cuna`) de cada anunciante se muestran colapsadas bajo su tarjeta.

### Generación — prompts monólogo (INTRO, APERTURA, CIERRE, NOTICIAS, TRANSICION, ENTRETENIMIENTO, CUNA, PUBLICIDAD)
- Cada prompt builder acepta `locutor?: LocutorPromptConfig`.
- Si `locutor.nombre` está definido, se incluye en el prompt: `Locutor: ${locutor.nombre}`.
- Si `locutor.personalidad` está definida, se añade: `Personalidad del locutor: ${locutor.personalidad}`.
- Fallback cuando no hay `locutorA`: se omiten ambas líneas y el prompt funciona igual que antes.
- `worker/index.ts` resuelve el `RadioVoz` de la voz asignada al bloque (`bloque.vozId`) para obtener `nombreAlAire` y `personalidad`, y los pasa como `locutorA` a `generarGuionPorTipo`.

### Generación — prompts diálogo (NOTICIA, Spotify presentación, Spotify intro-apertura)
- Los prompts de diálogo usan `locutorA.nombre` / `locutorB.nombre` como etiquetas de turno en lugar de los literales `LOCUTOR_A` / `LOCUTOR_B`.
- Si `personalidad` está definida para un locutor, se agrega al prompt antes del diálogo:
  ```
  PERSONAJE [nombre]: [personalidad]
  ```
- Fallback: si `nombreAlAire` es null, se usa `LOCUTOR_A` / `LOCUTOR_B`.
- `worker/processors/noticia.ts` resuelve `RadioVoz` de `bloque.elevenlabsVoiceId` (voz A) y `bloque.elevenlabsVoiceId2` (voz B) consultando por `Voz.geminiVoiceId` + `radioId`.
- `src/lib/spotify/generarPresentacion.ts` y `generarIntroApertura.ts` resuelven `RadioVoz` de las voces de la sesión antes de llamar al prompt.

## Notes

- `nombreAlAire` y `personalidad` viven en `RadioVoz` (no en `Voz`) porque el mismo engine de voz puede llamarse "Carlos" en Radio Uno y "Mario" en Radio Dos.
- La migración es additive (columnas nullable), no rompe producción.
- El `AnunciantesManager` nuevo debe replicar el mismo CRUD que ya existe en `/api/anunciantes` — no cambiar la API, solo mover la UI.
- Para resolver `RadioVoz` desde un `elevenlabsVoiceId` (que es `Voz.geminiVoiceId`), el worker hace: `prisma.radioVoz.findFirst({ where: { radioId, voz: { geminiVoiceId: elevenlabsVoiceId } } })`.
- Para bloques con `vozId` directo: `prisma.radioVoz.findFirst({ where: { radioId, vozId: bloque.vozId } })`.
- Si el `RadioVoz` no se encuentra o `nombreAlAire` es null, el fallback es `LOCUTOR_A` / `LOCUTOR_B` para diálogos, y se omiten las líneas de locutor para monólogos.

## AC
- [ ] La sidebar tiene una sola entrada "Locutores" que activa `/locutores`; "Voces" y "Anunciantes" ya no aparecen
- [ ] Acceder a `/voces` redirige a `/locutores`
- [ ] Acceder a `/anunciantes` redirige a `/locutores?tab=anunciantes`
- [ ] En el tab Locutores, al crear/editar una voz se pueden ingresar "Nombre al aire" y "Personalidad"
- [ ] La tarjeta de un locutor con `nombreAlAire = "Carlos"` muestra "Carlos" visiblemente
- [ ] Al generar un bloque NOTICIA con voz A `nombreAlAire = "Carlos"` y voz B `nombreAlAire = "Laura"`, el guión contiene `CARLOS:` y `LAURA:` como etiquetas de turno
- [ ] Al generar una presentación Spotify con voz1 `nombreAlAire = "Carlos"`, el guión contiene `CARLOS:` como etiqueta
- [ ] Al generar un bloque monólogo (INTRO, CIERRE, etc.) con `nombreAlAire = "Carlos"`, el prompt incluye `Locutor: Carlos`
- [ ] Con `personalidad` definida en un locutor, el prompt generado incluye la sección `PERSONAJE` o `Personalidad del locutor` antes del diálogo/texto
- [ ] Si `nombreAlAire` es null para un locutor, el sistema usa `LOCUTOR_A`/`LOCUTOR_B` como fallback sin errores
- [ ] El tab Anunciantes lista los anunciantes existentes y permite agregar uno nuevo

## Changelog
- v1 (2026-05-26): spec inicial
