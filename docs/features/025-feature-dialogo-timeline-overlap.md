# Feature: Diálogo con overlap temporal entre turnos
> Status: DONE
> v1 | 2026-05-26

## Why
Los diálogos multi-voz suenan a lectura por turno porque se ensamblan con concat secuencial; en conversación real los hablantes empiezan antes de que el otro termine, y eso hay que reproducirlo en el audio.

## Files

### Create
- `src/lib/audio/dialogoTimeline.ts` — función `ensamblarDialogoTimeline` que coloca clips en un timeline con timestamps absolutos y mezcla con amix

### Modify
- `src/lib/audio/dialogoParser.ts` — reemplazar `silenciosMsEntreTurnos` por `overlapsMsEntreTurnos`; los valores positivos son overlap (ms de anticipación), los negativos son gap (silencio)
- `src/lib/audio/noticiaAudio.ts` — usar `overlapsMsEntreTurnos` + `ensamblarDialogoTimeline` en vez de `silenciosMsEntreTurnos` + `ensamblarSecuencia`
- `src/lib/spotify/generarPresentacion.ts` — ídem
- `src/lib/spotify/generarIntroApertura.ts` — ídem si usa diálogo multi-voz

## Contracts

```typescript
// dialogoParser.ts

/**
 * Para cada turno[1..N-1]: cuántos ms adelanta su inicio respecto al fin del turno anterior.
 * Positivo = overlap (empieza antes de que el anterior termine).
 * Negativo = gap (empieza después; |valor| = ms de silencio).
 * Longitud de retorno: turnos.length - 1
 */
export function overlapsMsEntreTurnos(turnos: TurnoDialogo[]): number[]
```

```typescript
// dialogoTimeline.ts

export async function ensamblarDialogoTimeline(params: {
  archivos: string[]           // un path por turno, mismo orden que el guion
  outputPath: string
  overlapsPorTurno: number[]   // longitud archivos.length - 1
}): Promise<void>
```

## Behavior

**Tabla de overlaps por tipo de turno entrante**

| Tipo del turno que empieza | Overlap con el anterior |
|---------------------------|------------------------|
| `reaccion`                | +200 ms (overlap real) |
| `pregunta`                | +80 ms (overlap leve)  |
| `afirmacion`              | −80 ms (gap corto)     |
| `pausa`                   | −100 ms (gap normal)   |

`overlapsMsEntreTurnos` devuelve el valor del turno **entrante** (índice i+1), no del saliente.

**`ensamblarDialogoTimeline`**

1. Obtiene la duración de cada clip con `getAudioDuration`.
2. Calcula `startMs[0] = 0`; para cada turno i≥1: `startMs[i] = startMs[i-1] + duracion[i-1] - overlapsPorTurno[i-1]`.
3. Normaliza todos los clips a 44100 Hz mono PCM (igual que `ensamblarSecuencia`).
4. Construye un filter graph FFmpeg con `adelay` por clip (valor = `startMs[i]`) y mezcla con `amix=inputs=N:duration=longest:normalize=0`.
5. Escribe el resultado en `outputPath` como MP3 128k.
6. Elimina los temporales al finalizar.

**Callers**

`noticiaAudio.ts` y `generarPresentacion.ts` reemplazan la llamada a `silenciosMsEntreTurnos` + `ensamblarSecuencia` por `overlapsMsEntreTurnos` + `ensamblarDialogoTimeline`. Sin otros cambios en esos archivos.

`ensamblarSecuencia` no se toca; sigue siendo el assembler para bloques no-dialogo (intros mono, transiciones, etc.).

## Notes

- `normalize=0` en amix es obligatorio: sin él FFmpeg baja el volumen de todos los inputs proporcionalmente al número de fuentes y el audio queda muy bajo.
- El overlap de reacción (200ms) puede solapar el final de una frase larga sin problema perceptivo: el cerebro prioriza la nueva voz cuando empieza. Solapar más de 400ms empieza a sonar a caos — el límite de 200ms es conservador.
- Si `startMs[i]` resulta negativo por acumulación (caso imposible con estos valores pero defensivo), clampear a 0.
- `generarIntroApertura.ts` solo aplica si el guion es multi-locutor (LOCUTOR_A / LOCUTOR_B); si es mono, no hay nada que cambiar.

## AC
- [ ] Al escuchar una noticia generada, los turnos de reacción corta (≤ 7 palabras) se perciben como interjecciones que se solapan con el final del turno anterior, no como pausas.
- [ ] Un diálogo de presentación Spotify tiene al menos un turno donde el segundo locutor empieza antes de que el primero haya terminado (audible).
- [ ] El audio resultante no suena más bajo que antes (sin degradación de volumen por amix).
- [ ] Los bloques que usan `ensamblarSecuencia` sin diálogo (intros, transiciones) no cambian su comportamiento.
- [ ] No hay archivos temporales en disco tras la generación (cleanup correcto).

## Changelog
- v1 (2026-05-26): spec inicial — timeline assembly con overlap para diálogos multi-voz
