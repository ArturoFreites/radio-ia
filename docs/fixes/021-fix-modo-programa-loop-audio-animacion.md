# Fix: Modo programa — loop infinito, secciones colgadas y animación de voz ausente
> Status: DONE
> v1 | 2026-05-26

## Bug

En el vivo, cuando un programa termina todos sus bloques:
1. Si no hay Spotify conectado, el programa se reinicia desde el principio en un loop infinito.
2. Algunos bloques (especialmente `APERTURA`) quedan colgados y no avanzan al siguiente.
3. No hay indicación visual de que el audio está reproduciéndose.

## Root cause

**Loop infinito:**
`src/components/aire/AireController.tsx:205-212` — `onFinPrograma` llama `programRef.current?.reiniciarDesdeElInicio()` cuando `!spotifyOk`, provocando que el programa se repita indefinidamente en lugar de terminar.

**Secciones colgadas (ended no se dispara):**
`src/app/api/audio/stream/[programaId]/route.ts:22-27` y `src/app/api/audio/preview/[bloqueId]/route.ts:74-80` — los endpoints sirven el archivo sin header `Content-Length` ni soporte de `Accept-Ranges`. Sin `Content-Length`, algunos browsers (especialmente Safari y Chrome en ciertas condiciones) no disparan el evento `ended` del `<audio>`, quedando el bloque colgado.

**Animación de voz ausente:**
`src/components/aire/ModoPrograma.tsx` — no hay ningún indicador visual de reproducción activa.

## Fix

### 1. Eliminar el loop en `AireController`

En `onFinPrograma`, eliminar la llamada a `reiniciarDesdeElInicio()`. Cuando el programa termina sin Spotify disponible, no reiniciar: la pantalla del programa debe mostrar estado "fin de programa" y esperar al siguiente slot.

El estado `programaAgotado` ya existe y se usa para que `desiredModo` evite volver a `"PROGRAMA"` cuando hay Spotify. Hay que extender ese comportamiento para que también aplique cuando `!spotifyOk`: si `programaAgotado && !spotifyOk`, `desiredModo` debe retornar `"IDLE"` (o un nuevo valor `"FIN_PROGRAMA"`) en lugar de `"PROGRAMA"`.

Cambio en `desiredModo`:
```
if (listo && conToken) {
  if (!programaAgotado) return "PROGRAMA";
  if (spotifyOk) return "DJ";
  return "IDLE";   // ← antes retornaba "PROGRAMA" causando el loop
}
```

### 2. Agregar `Content-Length` y `Accept-Ranges` a los endpoints de audio

En ambos endpoints (`stream/[programaId]` y `preview/[bloqueId]`), antes de crear el `ReadStream`:
- Obtener el tamaño del archivo con `stat(path)`.
- Incluir en la respuesta los headers:
  - `Content-Length: <bytes>`
  - `Accept-Ranges: bytes`
- Si la request incluye header `Range`, responder con status `206` y el rango solicitado (usar `createReadStream(path, { start, end })`).

Esto garantiza que el browser recibe un stream con longitud conocida y que el evento `ended` se dispare correctamente en todos los browsers.

### 3. Agregar animación de voz en `ModoPrograma`

En `ModoPrograma.tsx`:
- Agregar estado `playing: boolean` que se activa cuando el audio empieza a reproducirse y se desactiva cuando termina o se pausa.
- Escuchar los eventos `play`, `pause` y `ended` del elemento `<audio>` para actualizar `playing`.
- Cuando `playing === true`, mostrar la animación de barras de onda igual a la de `PresentacionOverlay`:
  - 5 barras con `waveBar` keyframe (0%→4px, 50%→28px, 100%→4px)
  - Color: `rgb(245 158 11)` (amber-500)
  - `animationDelay` escalonado: `[0, 120, 240, 360, 480]ms`
- La animación se muestra debajo del título del bloque actual, encima de la barra de progreso.

## Verify

**Loop:**
- Iniciar un programa en vivo sin Spotify conectado.
- Esperar a que termine el último bloque.
- Esperado: el programa queda en estado "fin de programa" (IDLE) y no reinicia.
- No esperado: el programa vuelve a empezar desde el primer bloque.

**Secciones colgadas:**
- Reproducir un programa en vivo con al menos 3 bloques.
- Verificar que cada bloque avanza al siguiente automáticamente al terminar el audio.
- Verificar en Safari que el evento `ended` dispara y el bloque cambia.
- Verificar que `Content-Length` aparece en los headers de la respuesta del endpoint de audio.

**Animación:**
- Mientras un bloque está reproduciéndose, deben verse las 5 barras animadas amber debajo del título.
- Al terminar el bloque o pausar, las barras desaparecen.

## Changelog
- v1 (2026-05-26): spec inicial — loop, audio sin Content-Length, animación de voz
