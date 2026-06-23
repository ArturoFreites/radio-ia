# Fix: Publicidad en vivo — ciclo fade sin audio

> Status: DONE
> v1 | 2026-06-22

## Bug

Algunas publicidades en modo DJ en vivo muestran el overlay, hacen fade out de Spotify, vuelven al modo DJ normal con fade in, y repiten el ciclo sin reproducir audio.

## Root cause

`src/hooks/useDjInterrupciones.ts:212-237` — `onBeforePlay` (fade out) se ejecuta antes de confirmar que el audio está listo. Si la preparación falla (`prepared === null`) o `audio.play()` falla, el bloque `finally` igualmente llama `onAfterPlay` (fade in). Además, `ultimasRef.current[tipo]` solo se actualiza en reproducción exitosa; al reprogramar, `calcularProximaInterrupcion` devuelve `enMs = 0` porque el intervalo ya venció, provocando reintentos inmediatos en bucle.

`src/lib/aire/djInterrupcionServicio.ts:99-101` — la resolución de `audioUrl` no contempla todas las rutas de almacenamiento; publicidades con audio pregrabado en path relativo o bajo `AUDIO_STORAGE_PATH` fallan la lectura y, si no tienen texto, no hay fallback TTS.

## Fix

1. En `useDjInterrupciones`: preparar y validar el audio **antes** de overlay y fade. Solo llamar `onBeforePlay`/`onAfterPlay` si hubo fade out real. Para PUBLICIDAD, rotar por el catálogo hasta encontrar una reproducible (máx. una vuelta); si ninguna sirve, omitir la interrupción sin fade. Actualizar `ultimasRef` al finalizar cada intento (éxito o fallo) para respetar el intervalo.
2. En `prepararInterrupcion`: rechazar respuestas cuyo `Content-Type` no sea `audio/*`.
3. Crear helper compartido `resolverRutaAudioAlmacenado` para unificar resolución de paths de audio pregrabado; usarlo en `djInterrupcionServicio` y devolver `contentType` según extensión del archivo.

## Verify

1. Configurar slot DJ con publicidad activa cada pocos minutos; incluir al menos un anunciante con `audioUrl` inválido y otro con solo texto.
2. Al dispararse la publicidad: solo debe haber fade si el audio se reproduce; el anunciante inválido se salta y suena el siguiente con texto.
3. Si todos los anunciantes fallan, no debe haber fade ni ciclo repetido — la próxima publicidad espera el intervalo completo.
4. Publicidad con audio pregrabado en storage relativo se reproduce correctamente.

## Changelog

- v1 (2026-06-22): spec inicial
