# Feature: Intro de apertura al iniciar sesión DJ

> Status: DONE
> v1 | 2026-05-26

## Why
Al iniciar el modo DJ en vivo, la experiencia debe sentirse como una apertura de radio profesional: primero la voz del locutor presenta la sesión, y solo después comienza la música.

## Files

### Create
- `src/app/api/spotify/sesion/[id]/intro-apertura/route.ts` — POST que genera y devuelve la intro de apertura de la sesión
- `src/lib/spotify/generarIntroApertura.ts` — función que genera el audio de intro (guion Gemini + TTS ElevenLabs + ensamblar)

### Modify
- `src/lib/spotify/prompts.ts` — agregar `buildIntroAperturaPrompt`
- `src/components/spotify/SpotifyPanel.tsx` — bloquear inicio de Spotify en el evento `ready` hasta que la intro se reproduzca o falle
- `src/components/spotify/PresentacionOverlay.tsx` — aceptar prop opcional `titulo: string` que reemplaza `track?.name` cuando no hay track (para mostrar el nombre de la radio durante la intro)

## Contracts

```ts
// POST /api/spotify/sesion/[id]/intro-apertura
// Body: { panelToken: string }
// Response 200: { audioUrl: string | null }
// null cuando la sesión no tiene voces configuradas o la generación falla

// buildIntroAperturaPrompt
(config: { radioNombre: string; estiloRadio: string }): string

// PresentacionOverlay — nueva prop
titulo?: string  // si se pasa, reemplaza track?.name en el heading
```

## Behavior

- En el evento `ready` del SDK, **no** llamar a la secuencia de inicio de Spotify todavía
- Hacer POST a `/api/spotify/sesion/[id]/intro-apertura` con `{ panelToken }`
- Si la sesión no tiene `voz1Id` ni `voz2Id`, el endpoint responde `{ audioUrl: null }` → el cliente arranca Spotify directo sin espera
- Si `audioUrl` tiene valor, mostrar el overlay con `titulo` = nombre de la radio (sin info de track ni portada) y reproducir el audio
- Solo al terminar el audio (o tras 20 s de timeout desde el POST) se inicia la reproducción de Spotify normalmente
- `generarIntroApertura` sigue el mismo pipeline que `generarPresentacionTrack`: Gemini → parsear diálogo → ElevenLabs por turno → ensamblar
- El audio de intro se guarda en `${AUDIO_STORAGE_PATH}/spotify/intro-{sesionId}.mp3`; si el archivo ya existe y tiene menos de 30 min de antigüedad, devolverlo directamente sin regenerar
- El prompt de apertura genera un diálogo de ≤ 60 palabras que menciona el nombre de la radio y da la bienvenida a los oyentes

## Notes

- Si el POST tarda más de 20 s (timeout de red o de ElevenLabs), arrancar Spotify igual sin bloquear la sesión; es mejor experiencia que silencio eterno
- El overlay de intro no muestra portada ni artista; solo `titulo` = nombre de la radio y la animación de voz
- Reutilizar el mismo `PresentacionOverlay` con `titulo` en lugar de duplicar componentes

## AC
- [ ] Al entrar en modo DJ, se escucha la voz de apertura antes de que comience la primera canción
- [ ] Si no hay voces configuradas en la sesión, la primera canción arranca sin ninguna espera extra
- [ ] Si la generación tarda más de 20 s o falla, la primera canción arranca de todos modos
- [ ] El overlay durante la intro muestra el nombre de la radio como título (no un nombre de track)
- [ ] En sesiones donde ya hubo intro hace menos de 30 min, el audio se reutiliza sin llamar a Gemini ni ElevenLabs

## Changelog
- v1 (2026-05-26): inicial
