# Feature: Playlist por slot DJ — Única configuración del Modo DJ
> Status: DONE
> v4 | 2026-05-26

## Why
El operador configura todo el Modo DJ desde la grilla: slot tipo DJ → elige playlist → elige voces para los diálogos IA entre canciones. El vivo arranca solo. Conectar Spotify una vez (OAuth) es el único paso fuera de la grilla.

Supersede v3 (2026-05-26). Añade selección de voces en el slot (además de playlist), almacenadas como FK a `Voz` en `SlotGrilla`/`EventoGrilla`. `resolverSesionDj` sincroniza esas voces a `SpotifySesion` antes de que el vivo arranque.

## Files

### Create
- `prisma/migrations/` — tres migraciones secuenciales:
  1. Añadir `playlistId String?` y `playlistNombre String?` a `SlotGrilla` y `EventoGrilla`
  2. Añadir `voz1Id String?` y `voz2Id String?` a `SlotGrilla` y `EventoGrilla` (FK a `Voz`)
  3. Hacer `voz1Id String?` y `voz2Id String?` en `SpotifySesion` (ya aplicado por Cursor, confirmar)

### Modify
- `prisma/schema.prisma` — ver Contracts
- `src/lib/spotify/sesionAire.ts` — nueva función `resolverSesionDj` + actualizar `buscarSpotifySesionParaAire`
- `src/app/api/aire/estado/route.ts` — llamar `resolverSesionDj` cuando slot activo es DJ con `playlistId`
- `src/lib/grilla/mergeDia.ts` — incluir `playlistId`/`playlistNombre`/`voz1Id`/`voz2Id` en `toSlotHoy`
- `src/types/grilla.ts` — extender `SlotHoy` con los cuatro campos opcionales
- `src/app/api/grilla/slots/route.ts` — aceptar y guardar los cuatro campos en POST
- `src/app/api/grilla/slots/[id]/route.ts` — incluir en PATCH
- `src/app/api/grilla/eventos/route.ts` — aceptar y guardar en POST
- `src/app/api/grilla/eventos/[id]/route.ts` — incluir en PATCH si existe
- `src/components/grilla/SlotForm.tsx` — sección DJ: selector de playlist + selector de dos voces
- `src/components/grilla/GrillaEditor.tsx` — tarjeta DJ muestra playlist y voces configuradas

## Contracts

```prisma
// SlotGrilla y EventoGrilla — añadir:
playlistId     String?
playlistNombre String?
voz1Id         String?
voz2Id         String?
voz1           Voz?    @relation("SlotGrillaVoz1", fields: [voz1Id], references: [id], onDelete: SetNull)
voz2           Voz?    @relation("SlotGrillaVoz2", fields: [voz2Id], references: [id], onDelete: SetNull)

// EventoGrilla — mismas relaciones con nombres distintos:
voz1           Voz?    @relation("EventoGrillaVoz1", fields: [voz1Id], references: [id], onDelete: SetNull)
voz2           Voz?    @relation("EventoGrillaVoz2", fields: [voz2Id], references: [id], onDelete: SetNull)

// SpotifySesion — ya nullable (confirmar migración aplicada):
voz1Id  String?
voz2Id  String?
// Nota: SpotifySesion.voz1Id almacena geminiVoiceId (string), NO el Voz.id
```

```typescript
// src/types/grilla.ts — SlotHoy extendido
export type SlotHoy = {
  id: string
  tipo: "PROGRAMA" | "DJ"
  horaInicio: string
  duracionMin: number
  programa?: { id: string; nombre: string; estado: EstadoPrograma }
  origen: "slot" | "evento"
  // DJ únicamente:
  playlistId?: string
  playlistNombre?: string
  voz1GeminiId?: string   // geminiVoiceId resuelto, no el Voz.id
  voz2GeminiId?: string
  voz1Nombre?: string     // para mostrar en grilla
  voz2Nombre?: string
}
```

```typescript
// src/lib/spotify/sesionAire.ts — función nueva
async function resolverSesionDj(
  radioId: string,
  playlistIdSlot: string,
  playlistNombreSlot: string,
  voz1GeminiId: string | null,  // geminiVoiceId ya resuelto
  voz2GeminiId: string | null,
): Promise<SpotifySesionRow | null>
// Retorna null si no existe SpotifyConexion para la radio.
// Busca SpotifySesion existente (más reciente). Si no hay, crea una.
// Siempre actualiza voz1Id/voz2Id de la sesión con los valores del slot (si no son null).
// El playlistId/playlistNombre retornados son siempre los del SLOT.
```

## Behavior

**Sección DJ en SlotForm**

Cuando tipo es DJ, aparece un bloque con tres campos:

1. **Playlist** — `<select>` que llama `GET /api/spotify/playlists` al montar.
   - Solo muestra playlists con `canReadTracksViaApi === true` habilitadas. Las demás aparecen deshabilitadas con texto "(solo seguida / sin acceso por API)".
   - Si Spotify no está conectado o el fetch falla: aviso "Conectá Spotify primero" + link a `/spotify`. El select no aparece. El slot se guarda igualmente sin playlist.
   - Si no hay playlists propias: aviso "No tenés playlists disponibles en tu cuenta de Spotify".

2. **Locutor A** — `<select>` que llama `GET /api/voces` al montar.
   - Muestra todas las voces disponibles para la radio.
   - Opción vacía "Sin diálogo IA" al inicio (valor vacío). Si se elige, `voz1Id` se guarda null.

3. **Locutor B** — igual que Locutor A, independiente.
   - Si se elige "Sin diálogo IA" en alguno de los dos, no se genera diálogo entre canciones.

Al guardar el slot: los cuatro campos (`playlistId`, `playlistNombre`, `voz1Id`, `voz2Id`) se envían si tienen valor; se omiten o envían null si el operador no eligió.

**Tarjeta de slot DJ en GrillaEditor**
- Muestra el nombre de la playlist si está configurada. Si no: "sin playlist" en tono apagado.
- Muestra los nombres de las voces si están configuradas. Si no: "sin diálogo IA".

**Resolución de sesión en `/api/aire/estado`**

`mergeDia.ts` ya incluye `voz1`/`voz2` (con `include: { voz1: true, voz2: true }` en la query) para resolver el `geminiVoiceId` antes de retornar el slot.

Cuando slot activo es `tipo === "DJ"` y tiene `playlistId`:
1. Buscar `SpotifyConexion`. Si no existe → `spotifySesion: null`.
2. Llamar `resolverSesionDj(radioId, slot.playlistId, slot.playlistNombre, slot.voz1GeminiId, slot.voz2GeminiId)`.
3. `resolverSesionDj` busca cualquier `SpotifySesion` de la radio. Si existe, actualiza `voz1Id`/`voz2Id` con los del slot (solo si no son null). Si no existe, crea una nueva.
4. Retornar `spotifySesion` con `sesionId`/`panelToken` de la sesión + `playlistId`/`playlistNombre` del slot.

Cuando slot activo es DJ pero sin `playlistId` → usar sesión existente tal como está (backward compat).

**Generación de diálogos IA**
- Si `voz1Id`/`voz2Id` en la sesión son null: el endpoint `/api/spotify/sesion/[id]/presentacion` ya marca la presentación como LISTA inmediatamente sin generar audio (comportamiento existente).
- Si ambas voces están configuradas: el worker genera el diálogo normalmente.

**Flujo completo del operador**
1. Conectar Spotify en `/spotify` (OAuth, una sola vez).
2. En la grilla: crear slot DJ → elegir playlist → elegir Locutor A y B (o dejar "Sin diálogo IA").
3. Guardar el slot.
4. A la hora indicada, abrir `/aire` → DJ mode arranca con esa playlist. Si se eligieron voces, los diálogos IA se generan entre canciones.
5. Para cambiar playlist o voces: editar el slot en la grilla.

## Notes
- `SlotGrilla.voz1Id`/`voz2Id` son FK a `Voz.id`. `SpotifySesion.voz1Id`/`voz2Id` son `geminiVoiceId` strings. Son tipos distintos. `resolverSesionDj` hace la resolución: recibe `geminiVoiceId` (ya resuelto por `mergeDia` via `voz1.geminiVoiceId`) y lo escribe en la sesión.
- `mergeDia.ts` necesita incluir `voz1`/`voz2` en la query de `SlotGrilla` y `EventoGrilla` para resolver `geminiVoiceId` y `nombre`. Añadir el `include` correspondiente.
- `resolverSesionDj` puede hacer un `update` en la sesión existente solo si las voces del slot son no-null. Si el slot no tiene voces configuradas, no pisar las voces que ya tenga la sesión.
- La auto-creación de sesión en una GET es un efecto secundario de escritura aceptable porque es idempotente.
- No modificar `SpotifySetup.tsx`: queda como flujo alternativo para quien quiera crear sesiones manualmente.
- Los nombres de las relaciones en Prisma (`SlotGrillaVoz1`, `SlotGrillaVoz2`, `EventoGrillaVoz1`, `EventoGrillaVoz2`) son necesarios porque `Voz` tendría múltiples relaciones sin nombre explícito.

## AC
- [ ] Al crear/editar un slot DJ: aparece selector de playlist, selector Locutor A y selector Locutor B.
- [ ] La playlist y los nombres de las voces elegidas aparecen en la tarjeta del slot en la grilla semanal.
- [ ] Con Spotify conectado, playlist y voces configuradas en el slot: al llegar su hora, `/aire` inicia DJ mode con esa playlist y los diálogos IA se generan entre canciones.
- [ ] Si no hay sesión previa, el sistema auto-crea una al primer arranque del slot DJ.
- [ ] Si el operador elige "Sin diálogo IA" en algún locutor, la música suena pero sin diálogos entre canciones.
- [ ] Si Spotify no está conectado, el selector de playlist aparece deshabilitado con aviso; el slot se guarda igualmente.
- [ ] Un slot DJ sin playlist → IDLE con mensaje claro en el vivo.

## Changelog
- v1 (2026-05-13): spec inicial — playlist por slot + lookup tolerante
- v2 (2026-05-21): grilla como único punto de configuración (ver 009)
- v3 (2026-05-26): auto-crear SpotifySesion en aire/estado; voz1Id/voz2Id opcionales en schema
- v4 (2026-05-26): añadir selección de voces (Locutor A y B) en SlotForm; almacenar como FK a Voz en SlotGrilla/EventoGrilla; resolverSesionDj sincroniza voces a sesión
