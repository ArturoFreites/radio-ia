# Fix: CIERRE usa voz por defecto en lugar de la voz seleccionada
> Status: DONE
> v1 | 2026-05-26

## Bug
Al generar el programa completo, el bloque CIERRE ignora la voz seleccionada por el usuario y usa la voz por defecto (`ELEVENLABS_DEFAULT_VOICE_ID`).

## Root cause
`worker/index.ts:75-78` — `esSeccionEleven` solo incluye `APERTURA`, `NOTICIA` y `PUBLICIDAD`. CIERRE cae en el `else` y usa `bloque.voz?.geminiVoiceId ?? defaultVoice` (vía `vozId`, que en CIERRE siempre es `null`) en lugar de `bloque.elevenlabsVoiceId`.

## Fix
Agregar `TipoBloque.CIERRE` al conjunto `esSeccionEleven` en `worker/index.ts`. Con eso, el bloque CIERRE entra al mismo `if` que APERTURA y PUBLICIDAD: usa `elevenLabsTTS` con `bloque.elevenlabsVoiceId ?? defaultVoice` y guarda el audio como `.mp3`.

## Verify
1. Configurar un programa con un bloque CIERRE y una voz distinta a la por defecto.
2. Generar el programa completo.
3. Reproducir el audio del bloque CIERRE: debe sonar con la voz seleccionada, no con la voz hardcodeada `QK4xDwo9ESPHA4JNUpX3`.

## Changelog
- v1 (2026-05-26): Identificado. `esSeccionEleven` excluye CIERRE, causando que use `bloque.voz?.geminiVoiceId` (siempre null) → voz por defecto.
