# Feature: Publicidad demo en el vivo
> Status: DONE
> v1 | 2026-05-26

## Why
El operador necesita poder generar y reproducir una cuña publicitaria en vivo desde el teléfono para demostrarle a un comercio cómo sonaría su publicidad en la radio.

## Files

### Create
- `src/components/aire/PublicidadDemoModal.tsx` — modal mobile-first de 2 pasos: guión + voz → reproducir
- `src/app/api/aire/publicidad-demo/guion/route.ts` — genera guión publicitario con Gemini a partir de nombre/tema del negocio; auth por `aireToken`
- `src/app/api/aire/publicidad-demo/audio/route.ts` — llama a ElevenLabs TTS y devuelve el audio como stream `audio/mpeg`; NO guarda en disco; auth por `aireToken`
- `src/app/api/aire/publicidad-demo/voces/route.ts` — lista las voces (`RadioVoz`) configuradas para la radio; auth por `aireToken`

### Modify
- `src/components/aire/AireController.tsx` — reemplazar `modalCuna` por `modalPublicidadDemo`; agregar `reproducirAudioDemo(audioBlob)` que fade-out el audio actual, reproduce el blob, y al terminar fade-in de vuelta; pasar handler a `ControlsBar`
- `src/components/aire/ControlsBar.tsx` — reemplazar botón "Insertar publicidad" por "Demo publicidad"; habilitado en todos los modos (PROGRAMA, DJ, IDLE)

## Contracts

```typescript
// POST /api/aire/publicidad-demo/guion
// Body
type GuionRequest = {
  aireToken: string
  negocio: string   // nombre del comercio o tema libre
}
// Response
type GuionResponse = {
  guion: string     // texto listo para leer, ~20 segundos
}

// POST /api/aire/publicidad-demo/audio
// Body
type AudioRequest = {
  aireToken: string
  texto: string
  voiceId: string   // ElevenLabs voice ID
}
// Response: audio/mpeg stream — NO JSON

// GET /api/aire/publicidad-demo/voces?token=[aireToken]
type VocesResponse = {
  voces: Array<{
    voiceId: string   // ElevenLabs voice ID (geminiVoiceId en modelo Voz)
    nombre: string
    nombreAlAire: string | null
    genero: string
  }>
}
```

## Behavior

**Botón en ControlsBar**
- Reemplaza "Insertar publicidad" por "Demo publicidad"
- Está habilitado en todos los modos (PROGRAMA, DJ, IDLE), no solo en PROGRAMA
- Al pulsarlo abre `PublicidadDemoModal`

**PublicidadDemoModal — Paso 1: Guión**
- Dos pestañas o toggle: "Texto libre" / "Generar desde negocio"
- Modo "Texto libre": textarea donde se escribe el texto exacto a leer
- Modo "Generar desde negocio": campo de texto para el nombre o descripción del comercio + botón "Generar guión"
  - Al pulsar "Generar guión": llama a `POST /api/aire/publicidad-demo/guion`
  - Muestra spinner mientras genera
  - El guión generado aparece en un textarea editable — el operador puede ajustarlo antes de seguir
- Botón "Siguiente →" avanza al Paso 2 (habilitado cuando hay texto)

**PublicidadDemoModal — Paso 2: Voz**
- Lista las voces de la radio desde `GET /api/aire/publicidad-demo/voces`
- Selector visual tipo lista con nombre + género de cada voz
- Botón "Reproducir ahora" en la parte inferior, grande y fácil de pulsar
- Al pulsar "Reproducir ahora":
  1. Muestra estado "Generando audio…"
  2. Llama a `POST /api/aire/publicidad-demo/audio` → recibe stream `audio/mpeg` → crea un `Blob` → URL de objeto
  3. Cierra el modal
  4. Dispara `reproducirAudioDemo(blob)`

**`reproducirAudioDemo` en AireController**
- Fade out del audio actual (spotify o programa, según `modo`)
- Crea un `HTMLAudioElement` temporal con la URL del blob
- Reproduce el audio
- Al terminar (`onended`): revoca la URL del blob, fade in del audio anterior
- Si el operador cierra la página durante la reproducción, el blob se revoca por limpieza normal del browser

**Manejo de errores en el modal**
- Si `POST /api/aire/publicidad-demo/guion` falla: mensaje inline "No se pudo generar el guión. Escribí el texto manualmente." — no bloquea el flujo
- Si `POST /api/aire/publicidad-demo/audio` falla: mensaje "Error al generar el audio. Intentá de nuevo."
- Si no hay voces configuradas para la radio: mensaje "No hay voces configuradas. Agregá una voz desde el dashboard." + botón deshabilitado

**Sin persistencia**
- Ningún audio ni guión generado se guarda en disco ni en base de datos
- Es completamente efímero: el blob vive en memoria del browser hasta que termina la reproducción

## Notes

- `POST /api/aire/publicidad-demo/audio` reutiliza la lógica de llamada a ElevenLabs pero retorna el buffer directamente como `Response` con `Content-Type: audio/mpeg` en lugar de escribir a disco. No modificar `elevenLabsTTS` existente.
- El guión se genera con `buildPublicidadPrompt` de `src/lib/gemini/prompts/publicidad.ts` — ya existe. Usar `duracionObjetivo: 20` y pasar el nombre del negocio como `infoAnunciante`.
- Auth en los tres endpoints: validar `aireToken` contra `Radio.aireToken` con una query Prisma. Misma lógica que `/api/aire/estado`.
- `reproducirAudioDemo` debe interrumpir el audio actual sin importar el modo activo. Para DJ: `spotifyRef.current?.fadeOutPause(1500)`. Para PROGRAMA: `programRef.current?.fadeOutStop(1500)`. Para IDLE: no hay nada que pausar.
- El modal es `position: fixed; inset: 0` en mobile — ocupa toda la pantalla. En desktop se puede centrar con `max-w-sm`.
- Los botones del modal deben tener `min-height: 48px` para táctil (regla WCAG touch target).
- El fade de vuelta al audio anterior solo aplica si `modo` no cambió mientras sonaba la publicidad.

## AC
- [ ] El botón "Demo publicidad" en `ControlsBar` está habilitado estando en modo IDLE (sin programa ni DJ activo)
- [ ] En modo "Generar desde negocio", escribir "Ferretería García" y pulsar "Generar guión" devuelve un texto de ~20 segundos
- [ ] El guión generado es editable en el textarea antes de continuar
- [ ] El selector de voces muestra las voces configuradas para la radio
- [ ] Al pulsar "Reproducir ahora" y esperar, se escucha el audio por los parlantes del navegador
- [ ] El audio de la demo se escucha completo sin que el modal esté abierto (se cierra antes de reproducir)
- [ ] En mobile (375px de ancho), el modal ocupa toda la pantalla y los botones son fáciles de pulsar
- [ ] Al terminar la cuña, el audio anterior (DJ o programa) retoma su reproducción con fade in
- [ ] Si no hay voces configuradas en la radio, el botón "Reproducir ahora" está deshabilitado con un mensaje visible

## Changelog
- v1 (2026-05-26): spec inicial
