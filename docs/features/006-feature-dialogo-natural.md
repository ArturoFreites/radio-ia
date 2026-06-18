# Feature: Diálogos más naturales entre locutores
> Status: DONE
> v1 | 2026-05-13

## Why
Los diálogos generados suenan a dos personas leyendo en turnos, no a una conversación real; el problema tiene dos causas: los prompts producen frases siempre completas y formales, y el silencio fijo entre turnos no respeta el ritmo humano del intercambio.

## Files

### Modify
- `src/lib/audio/dialogoParser.ts` — extender `TurnoDialogo` con `tipo`, agregar `clasificarTurno()`
- `src/lib/audio/ensamblar.ts` — soportar silencios por turno (array) además del silencio global
- `src/lib/audio/noticiaAudio.ts` — calcular silencio por turno antes de ensamblar
- `src/lib/spotify/generarPresentacion.ts` — calcular silencio por turno antes de ensamblar
- `src/lib/gemini/prompts/noticia.ts` — reescribir instrucciones de dinámica de conversación
- `src/lib/spotify/prompts.ts` — reescribir instrucciones de dinámica de conversación

## Contracts

```typescript
// dialogoParser.ts

type TipoTurno = 'reaccion' | 'pregunta' | 'afirmacion' | 'pausa'

// TurnoDialogo extendido (no rompe callers existentes: tipo es opcional en parsearDialogo)
interface TurnoDialogo {
  locutor: 'A' | 'B'
  texto: string
  tipo: TipoTurno
}

// Clasificación pura, sin IA, basada solo en el texto del turno
function clasificarTurno(texto: string): TipoTurno
```

```typescript
// ensamblar.ts — extensión no-breaking de ensamblarSecuencia

// Nueva firma (silencioMs sigue funcionando para callers existentes)
// Si silenciosPorTurno está presente, tiene prioridad sobre silencioMs
// Longitud de silenciosPorTurno debe ser archivos.length - 1
async function ensamblarSecuencia(params: {
  archivos: string[]
  outputPath: string
  silencioMs?: number
  silenciosPorTurno?: number[]
}): Promise<void>
```

## Behavior

**Clasificación de turnos (`clasificarTurno`)**

Reglas evaluadas en orden, primera que cumple gana:

| Condición | Tipo |
|-----------|------|
| `palabras <= 7` | `reaccion` |
| termina en `?` | `pregunta` |
| `palabras >= 20` | `pausa` |
| resto | `afirmacion` |

**Tabla de silencios por tipo**

| Tipo | Silencio (ms) |
|------|--------------|
| `reaccion` | 100 |
| `pregunta` | 150 |
| `afirmacion` | 280 |
| `pausa` | 450 |

El silencio se aplica **después** del turno actual, antes del siguiente. El último turno no lleva silencio.

**noticiaAudio.ts y generarPresentacion.ts**

Ambos deben:
1. Llamar a `clasificarTurno(turno.texto)` para cada turno
2. Construir el array `silenciosPorTurno` (N-1 elementos para N turnos)
3. Pasarlo a `ensamblarSecuencia`

**Prompt de noticia (`buildNoticiaPrompt`)**

Cambios en las instrucciones de dinámica:
- Exigir **al menos 2 turnos de reacción corta** (≤ 7 palabras): ejemplos como `"¿Y cómo terminó?"`, `"Claro, tiene lógica."`, `"Sí, exactamente."`
- Permitir frases incompletas retomadas por el otro locutor
- Variar los finales: algunos turnos terminan en `?`, otros en `.`, uno puede terminar en `...` indicando que el pensamiento continúa en el otro
- Eliminar la restricción implícita de "frases siempre completas y bien formadas": el lenguaje oral no lo es
- Mantener las reglas existentes: sin acotaciones entre corchetes, español argentino, máximo 130 palabras, mínimo 4 turnos

**Prompt de Spotify (`buildSpotifyPresentacionPrompt`)**

Mismas instrucciones de mezcla que noticia, adaptadas al presupuesto de 80 palabras:
- Al menos 1 turno de reacción corta (≤ 7 palabras) dentro del diálogo
- El turno final puede ser corto y directo (prepara al oyente para la música)
- Mantener las reglas existentes: dato curioso de LOCUTOR_B, mencionar artista y tema

## Notes

- `clasificarTurno` no usa `palabras` como token split literal — contar palabras con `texto.trim().split(/\s+/).length`
- Callers existentes de `ensamblarSecuencia` (bloques de programa, etc.) no cambian: siguen pasando solo `silencioMs` y el comportamiento es idéntico
- El límite de 7 palabras para `reaccion` es arbitrario pero calibrado: "Sí, exactamente, tiene sentido." = 5 palabras → reaccion; "Sí, y además hay que considerar el impacto en..." = 9 palabras → afirmacion
- Los prompts no deben incluir ejemplos de diálogos completos (few-shot) — Gemini los sobreajusta al ejemplo y pierde variedad. Solo instrucciones.

## AC
- [x] El audio de una noticia generada tiene al menos 2 pausas de duración notablemente diferente entre sí (audible al escuchar)
- [x] Un diálogo generado por el prompt de noticia contiene al menos 2 turnos de ≤ 7 palabras al revisar el `guion` guardado
- [x] Un diálogo generado por el prompt de Spotify contiene al menos 1 turno de ≤ 7 palabras
- [x] Los turnos cortos (reacción) tienen un silencio previo al siguiente turno de ~100ms (verificable en la forma del archivo WAV o en logs)
- [x] Callers existentes de `ensamblarSecuencia` sin `silenciosPorTurno` mantienen el comportamiento anterior sin error

## Changelog
- v1 (2026-05-13): spec inicial — prompts más naturales + timing dinámico de silencios
