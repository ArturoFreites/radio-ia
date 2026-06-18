# Fix: Voces duplicadas por falta de unicidad en ElevenLabs voice ID
> Status: DONE
> v1 | 2026-05-25

## Bug
El operador puede crear dos voces con distinto nombre pero el mismo ElevenLabs voice ID. El `VozSelectorLocal` usa `geminiVoiceId` como `value` del `<select>`, por lo que ambas entradas apuntan al mismo locutor real y el selector queda en estado inconsistente (dos opciones con el mismo valor).

Reproducir: ir a `/voces`, crear "Locutor A" con voice ID `abc123`, luego crear "Locutor B" con el mismo voice ID `abc123`. Ambas aparecen en la lista y en el selector de bloques.

## Root cause

`prisma/schema.prisma:162` — `Voz.geminiVoiceId` no tiene `@unique`. El `upsert` en `src/app/api/voces/route.ts:38` opera sobre `nombre`, no sobre el voice ID, por lo que dos nombres distintos con el mismo ID no colisionan.

## Fix

1. Agregar `@unique` a `Voz.geminiVoiceId` en el schema de Prisma y generar la migración.
2. En `POST /api/voces`, antes del upsert, intentar buscar una `Voz` existente con ese `geminiVoiceId`. Si existe y pertenece a un nombre distinto, devolver `400` con mensaje claro: "Ya existe una voz con ese ElevenLabs voice ID".
3. Eliminar los registros duplicados en la migración con una estrategia `deduplicar antes de agregar constraint`: conservar el registro con `createdAt` más antiguo por cada `geminiVoiceId` duplicado.

## Verify

1. Crear una voz con voice ID `test-123`.
2. Intentar crear otra voz con el mismo voice ID `test-123` pero distinto nombre.
3. Resultado esperado: error `400` con mensaje "Ya existe una voz con ese ElevenLabs voice ID". No se crea un segundo registro.
4. El `VozSelectorLocal` en el editor de bloques no muestra opciones duplicadas.

## Changelog
- v1 (2026-05-25): spec inicial
