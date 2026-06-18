# Feature: Monólogos — voz única en toda la generación
> Status: DONE
> v2 | 2026-05-26

## Why
Toda la generación de audio usa una única voz (monólogo), sin excepciones. Esto aplica a bloques de programa (NOTICIA) y a todas las funciones del modo DJ (presentaciones de tracks, intro-apertura de sesión).

## Files

### Modify
- `src/lib/gemini/prompts/noticia.ts` — reemplazar prompt de diálogo por prompt de monólogo (mismo patrón que `noticias.ts`)
- `src/lib/gemini/guiones.ts` — caso `NOTICIA`: pasar `locutor` (locutorA) en vez de `nombreLocutorA`/`nombreLocutorB`; eliminar referencias a locutorB
- `src/lib/audio/noticiaAudio.ts` — simplificar a TTS de una sola voz; eliminar dependencias de `dialogoParser` y `dialogoTimeline`
- `worker/processors/noticia.ts` — eliminar `parsearDialogo`, validación de mínimo 4 turnos y lógica de voiceB; usar solo `elevenlabsVoiceId`; seguir el patrón de `apertura.ts`
- `src/lib/spotify/prompts.ts` — reescribir `buildSpotifyPresentacionPrompt` y `buildIntroAperturaPrompt` como monólogos usando `lineasLocutorMonologo`; eliminar parámetros de voz2 y formato de diálogo
- `src/lib/spotify/generarPresentacion.ts` — eliminar `parsearDialogo`, `overlapsMsEntreTurnos`, `ensamblarDialogoTimeline`; usar `elevenLabsTTS` directo con `voz1Id`; quitar la validación que aborta si `voz2Id` es null
- `src/lib/spotify/generarIntroApertura.ts` — eliminar `parsearDialogo`, `overlapsMsEntreTurnos`, `ensamblarDialogoTimeline`; usar `elevenLabsTTS` directo con `voz1Id`; quitar la validación que aborta si `voz2Id` es null

### Delete
- `src/lib/audio/dialogoParser.ts` — ya no tiene importadores activos
- `src/lib/audio/dialogoTimeline.ts` — ya no tiene importadores activos

## Contracts

```typescript
// noticiaAudio.ts — nueva firma simplificada
async function generarAudioNoticia(params: {
  guion: string;
  voiceId: string;          // antes voiceIdA + voiceIdB
  bloqueId: string;
  baseDirOverride?: string;
}): Promise<{ path: string; duracion: number }>
```

```typescript
// noticia.ts — nueva firma del prompt builder
function buildNoticiaPrompt(config: {
  contenidoNoticia: string;
  estiloRadio: string;
  nombrePrograma?: string;
  locutor?: LocutorPromptConfig;
  referenciaTemporalEmision?: string;
}): string
```

```typescript
// spotify/prompts.ts — buildSpotifyPresentacionPrompt nueva firma
function buildSpotifyPresentacionPrompt(config: {
  trackNombre: string;
  artistaNombre: string;
  albumNombre: string;
  anioAlbum?: string;
  generos?: string[];
  estiloRadio: string;
  locutor?: LocutorPromptConfig;   // antes voz1Nombre/voz2Nombre/personalidades
}): string

// spotify/prompts.ts — buildIntroAperturaPrompt nueva firma
function buildIntroAperturaPrompt(config: {
  radioNombre: string;
  estiloRadio: string;
  locutor?: LocutorPromptConfig;   // antes voz1Nombre/voz2Nombre/personalidades
  primeraCancion?: { nombre: string; artista: string };  // ver spec 034
}): string
```

## Behavior

- Todo bloque NOTICIA genera un monólogo de una sola voz, igual que APERTURA o CIERRE.
- El guion del bloque NOTICIA es texto plano sin marcas de turno (`LOCUTOR_A:`, `LOCUTOR_B:`).
- El worker de noticia solo requiere `elevenlabsVoiceId`; si `elevenlabsVoiceId2` es null, no falla.
- La presentación de track en modo DJ es un monólogo de locutor A que menciona canción, artista y un dato curioso.
- La intro-apertura del modo DJ es un monólogo de locutor A.
- Si `voz1Id` es null en una sesión Spotify, `generarPresentacion` y `generarIntroApertura` retornan sin audio (no lanzan error), igual que antes para `voz2Id`.
- El campo `estiloConversacion` del config del bloque queda inerte.
- El campo `elevenlabsVoiceId2` del bloque y `voz2Id` de la sesión quedan inertes para audio.

## Notes

- `guiones.ts` case `NOTICIA` actualmente pasa `nombreLocutorA/B` y `personalidadLocutorA/B`. Cambiar a `locutor: locutorA`.
- `generarPresentacion.ts` actualmente aborta si `!voz2Id`. Eliminar esa condición; solo validar `voz1Id`.
- `generarIntroApertura.ts` actualmente aborta si `!voz2Id`. Eliminar esa condición; solo validar `voz1Id`.
- La lógica de cache de 30 min en `generarIntroApertura` no cambia.
- `buildSpotifyPresentacionPrompt` actualmente pide que "locutorB diga UN dato curioso". En monólogo, el único locutor lo dice directamente.
- `dialogoParser.ts` y `dialogoTimeline.ts` son importados por `noticiaAudio.ts`, `generarPresentacion.ts` y `generarIntroApertura.ts`. Todos deben eliminarse antes de borrar estos módulos.
- `worker/index.ts` importa `dialogoParser` directamente; verificar y limpiar.

## AC
- [ ] Generar preview de un bloque NOTICIA produce audio de una sola voz
- [ ] El guion guardado en DB para NOTICIA es texto plano (sin `LOCUTOR_A:` ni `LOCUTOR_B:`)
- [ ] El worker de NOTICIA no falla si `elevenlabsVoiceId2` es null
- [ ] La presentación de track DJ es audio de una sola voz
- [ ] La intro-apertura del modo DJ es audio de una sola voz
- [ ] La generación de presentación y de intro-apertura no falla si `voz2Id` es null
- [ ] `dialogoParser.ts` y `dialogoTimeline.ts` no son importados por ningún módulo activo tras el cambio

## Changelog
- v1 (2026-05-26): spec inicial — solo cubría bloque NOTICIA
- v2 (2026-05-26): ampliado a todo el sistema — agrega casos Spotify (presentaciones y intro-apertura)
