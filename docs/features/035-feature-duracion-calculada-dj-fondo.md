# Feature: Duración calculada de programas + DJ como fondo permanente
> Status: DONE
> v1 | 2026-05-26

## Why
Cuando un programa termina antes de que expire el slot en la grilla, la Página de Aire queda en silencio. La duración del slot la fijaba el operador a mano, pero no tiene forma de saber cuánto dura el audio real. El DJ debe llenar cualquier hueco entre slots, no esperar a que haya un slot DJ activo.

## Files

### Modify
- `src/components/aire/AireController.tsx` — cambiar `desiredModo`: cuando no hay slot activo (`ahora === null`) ir a DJ si hay Spotify, no a IDLE
- `src/components/grilla/SlotForm.tsx` — ocultar el campo "Duración (min)" cuando `tipo === "PROGRAMA"`; mostrar duración calculada como texto informativo en modo edición
- `src/app/api/programas/[id]/bloques/route.ts` — al marcar el programa como LISTO, calcular duración real y propagarla

## Contracts

```typescript
// En el POST handler de /api/programas/[id]/bloques/route.ts,
// cuando todos los bloques quedan LISTO, además de actualizar programa.estado:
// 1. Calcular duracionEstimada = SUM(bloque.duracion) para todos los bloques del programa
// 2. Actualizar programa.duracionEstimada con ese valor (en segundos)
// 3. Propagar: actualizar duracionMin en todos SlotGrilla y EventoGrilla donde programaId = id
//    con Math.ceil(duracionEstimada / 60)
```

## Behavior

**DJ como fondo permanente (AireController)**
- `desiredModo` actual: cuando `estado.ahora === null` → IDLE
- Nuevo: cuando `estado.ahora === null` → DJ si `spotifyOk`, IDLE si no hay Spotify
- No cambia nada más del ciclo de estados. Los programas siguen arrancando en su `horaInicio` exacta.
- El `programaAgotado` ya transiciona a DJ cuando Spotify está disponible — sin cambios en esa lógica.

**Duración calculada tras generación**
- Trigger: todos los bloques del programa quedan en estado LISTO (lógica ya existente en `bloques/route.ts`)
- En ese mismo momento: calcular `SUM(bloque.duracion)` en segundos → guardar en `programa.duracionEstimada`
- Propagar: `Math.ceil(duracionEstimada / 60)` → actualizar `SlotGrilla.duracionMin` y `EventoGrilla.duracionMin` en todos los registros donde `programaId` coincide
- La grilla visual refleja la duración real del audio sin intervención del operador

**Formulario de slots (SlotForm)**
- Cuando `tipo === "PROGRAMA"`: el campo `Input` de duración no se renderiza
- El valor `duracionMin` sigue enviándose al API con el default 60 para slots nuevos
- En modo edición (`editar-slot` o `editar-evento`) con tipo PROGRAMA: si el programa tiene `duracionEstimada` (≠ null), mostrar texto informativo debajo del selector de programa: "Duración del audio: Xm Ys"
- Cuando `tipo === "DJ"`: el campo duración sigue visible y obligatorio (el DJ es clock-based)

## Notes

- `Bloque.duracion` está en segundos (`Int?`). Si algún bloque tiene `duracion = null` (audio no generado aún), ignorarlo en la suma — no debería ocurrir cuando todos están LISTO, pero es un guard.
- `SlotGrilla.duracionMin` es `Int` (requerido). La propagación sobreescribe el valor anterior sin condición.
- Si un mismo programa está asociado a múltiples slots, todos se actualizan en la misma transacción.
- El campo en SlotForm actualmente vive en un grid de 2 columnas junto a "Hora inicio" (`sm:grid-cols-2`). Al ocultar duración para PROGRAMA, ese grid pasa a tener un solo campo — simplificar a full-width.
- No hay migraciones de schema: `Programa.duracionEstimada` ya existe en el modelo.

## AC
- [ ] Crear un slot PROGRAMA en la grilla: el campo "Duración" no aparece en el formulario
- [ ] Crear un slot DJ: el campo "Duración" sí aparece y es obligatorio
- [ ] Tras generar todos los bloques de un programa, `programa.duracionEstimada` tiene el valor correcto en segundos
- [ ] El slot en la grilla muestra la duración real del audio (no los 60 min por defecto)
- [ ] En la Página de Aire, con un gap entre un programa y el próximo slot, el DJ arranca inmediatamente al terminar el programa sin silencio
- [ ] Si no hay Spotify conectado y hay un gap, se muestra IDLE (comportamiento esperado sin Spotify)

## Changelog
- v1 (2026-05-26): spec inicial
