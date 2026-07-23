# Feature: Interrupción DJ de texto libre desde grilla
> Status: DONE
> v1 | 2026-07-23

## Why
El operador necesita programar desde la grilla un mensaje de texto fijo que el locutor IA lea en voz alta cada X minutos, igual que hora y clima, sin depender del catálogo de publicidad ni de Gemini para inventar el contenido.

## Files

### Create
- (ninguno — se extiende el pipeline de interrupciones existente)

### Modify
- `prisma/schema.prisma` — campos `djTexto*` en `SlotGrilla` y `EventoGrilla`
- `src/types/grilla.ts` — `TipoInterrupcionDj` incluye `TEXTO`; config con contenido
- `src/lib/grilla/djConfigSchema.ts` — validación toggle + intervalo + texto (max chars)
- `src/lib/grilla/mergeDia.ts` — propagar campos texto a `SlotHoy`
- `src/lib/grilla/interrupcionesProyectadas.ts` — proyectar franjas tipo TEXTO; leyenda T
- `src/lib/grilla/slotColores.ts` — detectar texto activo en slot
- `src/lib/aire/djInterrupciones.ts` — timer TEXTO junto a H/C/P/(AUDIO)
- `src/lib/aire/djInterrupcionServicio.ts` — sintetizar TTS del texto fijo (sin Gemini)
- `src/hooks/useDjInterrupciones.ts` — enviar `texto` al preparar; overlay
- `src/app/api/aire/dj-interrupcion/preparar/route.ts` — aceptar tipo TEXTO + texto
- `src/app/api/aire/dj-interrupcion/guion/route.ts` — aceptar tipo TEXTO (eco del texto)
- `src/app/api/grilla/slots/route.ts` — persistir campos texto
- `src/app/api/grilla/slots/[id]/route.ts` — idem PATCH
- `src/app/api/grilla/eventos/route.ts` — idem
- `src/app/api/grilla/eventos/[id]/route.ts` — idem
- `src/app/api/aire/estado/route.ts` — incluir config texto en slot activo
- `src/components/grilla/InterruptionConfigCard.tsx` — tipo `texto` + textarea + contador
- `src/components/grilla/SlotForm.tsx` — toggle Texto + intervalo + contenido
- `src/components/grilla/SlotWizardDialog.tsx` — idem en wizard
- `src/components/grilla/SlotBloque.tsx` — color/franja TEXTO
- `src/components/grilla/GrillaEditor.tsx` / `GrillaTablaSemanal.tsx` — contar texto en badges
- `src/components/aire/DjInterrupcionOverlay.tsx` — overlay "Mensaje"
- `src/components/aire/InterrupcionesProgramadas.tsx` — listar texto programado
- `src/components/aire-dashboard/AireRightPanel.tsx` — mostrar texto en panel derecho
- `src/components/aire/AireBroadcastSidebar.tsx` — icono/label TEXTO

### Delete
- (ninguno)

## Contracts

```typescript
type TipoInterrupcionDj = "HORA" | "CLIMA" | "PUBLICIDAD" | "AUDIO" | "TEXTO";
// AUDIO solo si 045 ya está mergeada; si no, el union crece sin AUDIO.

const DJ_TEXTO_MAX_CHARS = 120;

type DjInterrupcionesConfig = {
  // …campos existentes…
  djTextoActiva: boolean;
  djTextoIntervaloMin: number | null;
  djTextoContenido: string | null;
};

// POST /api/aire/dj-interrupcion/preparar
// body (añadido):
// { aireToken, tipo: "TEXTO", voiceId, texto: string }  // 1..120 chars
```

Prisma en `SlotGrilla` y `EventoGrilla`:
- `djTextoActiva Boolean @default(false)`
- `djTextoIntervaloMin Int?`
- `djTextoContenido String?` — max 120 en validación Zod (no hace falta `@db.VarChar` estricto)

## Behavior

- En el formulario/wizard de slot DJ: nuevo toggle **Texto / Mensaje** junto a Hora, Clima, Publicidad (y Audios si existe).
- Si el toggle está activo: intervalo obligatorio (5–1440 min, igual que el resto) y textarea obligatorio con el mensaje.
- Contador visible `n/120`. No se puede guardar si el texto está vacío o supera 120 caracteres.
- Al desactivar el toggle: `djTextoIntervaloMin` y `djTextoContenido` se guardan como `null`.
- El calendario proyecta franjas tipo TEXTO igual que H/C/P.
- Subtítulo/leyenda del bloque incluye `T` cuando el texto está activo.
- En `/aire`, con slot DJ activo y Texto ON: cada X minutos fade de Spotify → TTS del texto exacto con la voz del slot → overlay "Mensaje" (opcional: preview truncado del texto) → fade in.
- El texto se lee **tal cual** lo escribió el operador. No pasa por Gemini (ahorro de cuota y control total del mensaje).
- Si el texto llega vacío en runtime (config inconsistente), se salta la interrupción sin romper el aire.
- Conflictos con presentación IA en curso: misma regla de posponer que las otras interrupciones.
- Multi-tenant: el texto vive en el slot del tenant; el endpoint de preparar valida `aireToken` y voz de la radio.

## Notes

- **Por qué no un `Anunciante`/publicidad:** el mensaje es editorial (eslogan, aviso, llamada a la acción de la radio), no un cliente pagador. No ensucia el catálogo comercial.
- **Por qué no Gemini:** el operador quiere decir exactamente esas palabras. Gemini alargaría o cambiaría el mensaje y rompería el límite de caracteres.
- **Límite 120:** ~8–12 s de locución en español; alineado con la duración corta de Hora (~15 s). Si en piloto piden más, subir a 160 en una iteración (bump de spec).
- Reutilizar fade/overlay/`useDjInterrupciones`; no inventar un segundo scheduler.
- Coexiste con feature 045 (AUDIO): ambos son interrupciones DJ independientes con su propio intervalo.
- En `preparar`, para TEXTO no exigir `GEMINI_API_KEY`; solo `ELEVENLABS_API_KEY` + voz válida.
- Truncar/sanitize en servidor (`trim` + max 120) aunque la UI ya limite, por defensa en profundidad.

## AC
- [x] Slot DJ guarda Texto ON + intervalo + contenido ≤120 chars
- [x] Toggle ON sin texto o con >120 → error claro al guardar
- [x] Calendario muestra franjas TEXTO proyectadas
- [x] En `/aire`, cada X minutos suena el mensaje con la voz del slot y overlay "Mensaje"
- [x] El audio dice el texto exacto guardado (sin reescritura IA)
- [x] Toggle OFF limpia intervalo y contenido en DB
- [x] Hora/Clima/Publicidad/(Audio) siguen funcionando sin regresión

## Changelog
- v1 (2026-07-23): Initial spec — interrupción TEXTO fija desde grilla
