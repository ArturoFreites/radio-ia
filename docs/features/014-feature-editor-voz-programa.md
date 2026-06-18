# Feature: Configuración de voz por defecto a nivel de programa
> Status: DONE
> v1 | 2026-05-25

## Why
El operador debe seleccionar la voz en cada bloque individualmente. Si un programa tiene 6 bloques y usa siempre la misma voz, el flujo es repetitivo y propenso a omisiones. Falta un lugar para definir la voz por defecto del programa que se pre-rellene en los bloques nuevos.

## Files

### Modify
- `prisma/schema.prisma` — agregar `vozPorDefectoId String?` y relación con `Voz` en `Programa`
- `src/app/api/programas/[id]/route.ts` — aceptar `vozPorDefectoId` en `PATCH`
- `src/app/(dashboard)/programas/[id]/page.tsx` — pasar `vozPorDefectoId` al `BloqueEditor`
- `src/components/editor/BloqueEditor.tsx` — mostrar selector de voz por defecto del programa en el encabezado; al crear un bloque nuevo, pre-rellenar `elevenlabsVoiceId` con el voice ID de la voz por defecto si el bloque no tiene una voz asignada
- `src/app/api/programas/[id]/bloques/route.ts` — en `POST`, si el body no trae `elevenlabsVoiceId` y el programa tiene `vozPorDefectoId`, poblar `elevenlabsVoiceId` desde la voz por defecto del programa

## Contracts

```prisma
model Programa {
  // ... campos existentes
  vozPorDefectoId  String?
  vozPorDefecto    Voz?     @relation(fields: [vozPorDefectoId], references: [id], onDelete: SetNull)
}
```

```typescript
// PATCH /api/programas/[id]
type PatchProgramaBody = {
  vozPorDefectoId?: string | null   // nuevo campo
  // otros campos existentes sin cambio
}
```

## Behavior

- En el encabezado del `BloqueEditor` aparece un selector de voz "Voz del programa" al lado del botón "Guardar timeline".
- El selector usa el mismo `VozSelectorLocal` ya existente.
- Al cambiar la voz del programa, se hace `PATCH /api/programas/[id]` con `{ vozPorDefectoId }` y aparece un toast "Voz del programa guardada".
- Cuando el operador agrega un bloque nuevo (+ Apertura, + Noticia, etc.), si ese bloque no tiene `elevenlabsVoiceId` asignado, se pre-rellena con el voice ID de la voz por defecto del programa.
- El selector de voz individual dentro de cada `BloqueCard` sigue existiendo y puede sobreescribir la voz por defecto para ese bloque específico.
- Si el programa no tiene voz por defecto, el comportamiento actual (bloque nuevo sin voz pre-asignada) se mantiene.

## Notes

- El pre-relleno ocurre también server-side en `POST /api/programas/[id]/bloques` como fallback, para cubrir casos donde el cliente no pueda hacerlo.
- No es necesario retroactivamente cambiar los bloques existentes al asignar una voz por defecto. Solo los bloques creados después de la asignación la heredan.
- La migración de Prisma agrega `vozPorDefectoId` como nullable; no hay valores por defecto necesarios.

## AC
- [ ] El `BloqueEditor` muestra un selector "Voz del programa" en el encabezado.
- [ ] Al seleccionar una voz y guardar, al recargar la página el selector muestra la voz elegida.
- [ ] Al agregar un bloque nuevo después de asignar la voz del programa, el selector de voz del bloque aparece pre-seleccionado con la voz del programa.
- [ ] Si se cambia la voz dentro de un bloque específico, esa voz individual persiste y no es sobreescrita por la voz del programa.
- [ ] Si no hay voz asignada al programa, los bloques nuevos tienen el selector en "Elegir voz…" (comportamiento actual).

## Changelog
- v1 (2026-05-25): spec inicial
