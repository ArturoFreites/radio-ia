# Feature: DJ interrupciones y presentación cada N temas
> Status: DONE
> v1 | 2026-06-12

## Why
El operador necesita configurar desde la grilla cuándo el DJ interrumpe la música (hora, clima, publicidad) y cada cuántos temas hay diálogo IA, con visualización en el calendario y overlays en vivo.

## Files

### Create
- `src/lib/grilla/interrupcionesProyectadas.ts` — calcula marcas de interrupción dentro de un slot DJ
- `src/lib/aire/djInterrupciones.ts` — lógica pura de scheduling y rotación de cuñas
- `src/components/aire/DjInterrupcionOverlay.tsx` — overlay full-screen por tipo de interrupción
- `src/app/api/aire/dj-interrupcion/guion/route.ts` — genera guión hora/clima/publicidad
- `src/app/api/aire/dj-interrupcion/audio/route.ts` — TTS o stream de cuña pregrabada
- `src/app/api/aire/dj-interrupcion/cunas/route.ts` — lista cuñas activas para rotación

### Modify
- `prisma/schema.prisma` — campos DJ en SlotGrilla y EventoGrilla
- `src/types/grilla.ts` — tipos con config de interrupciones y presentacionCadaTemas
- `src/lib/grilla/mergeDia.ts` — propagar campos nuevos a SlotHoy
- `src/app/api/grilla/slots/route.ts` — validación Zod campos DJ
- `src/app/api/grilla/slots/[id]/route.ts` — idem PATCH
- `src/app/api/grilla/eventos/route.ts` — idem
- `src/app/api/grilla/eventos/[id]/route.ts` — idem
- `src/app/api/aire/estado/route.ts` — incluir config DJ en slot activo
- `src/components/grilla/SlotForm.tsx` — presentacionCadaTemas + toggles interrupciones
- `src/components/grilla/SlotBloque.tsx` — franjas visuales de interrupciones
- `src/components/aire/ModoDJ.tsx` — hook useDjInterrupciones + overlay
- `src/components/aire/AireController.tsx` — reproducirInterrupcion, pasar config a ModoDJ
- `src/components/spotify/SpotifyPanel.tsx` — prop presentacionCadaTemas

## Contracts

```typescript
type TipoInterrupcionDj = "HORA" | "CLIMA" | "PUBLICIDAD";

type DjInterrupcionesConfig = {
  presentacionCadaTemas: number;
  djHoraActiva: boolean;
  djHoraIntervaloMin: number | null;
  djClimaActivo: boolean;
  djClimaIntervaloMin: number | null;
  djPublicidadActiva: boolean;
  djPublicidadIntervaloMin: number | null;
};

type InterrupcionProyectada = {
  tipo: TipoInterrupcionDj;
  offsetMin: number;
};

// POST /api/aire/dj-interrupcion/guion
type DjInterrupcionGuionRequest = {
  aireToken: string;
  tipo: TipoInterrupcionDj;
  cunaId?: string;
};
type DjInterrupcionGuionResponse = { guion: string };

// POST /api/aire/dj-interrupcion/audio
type DjInterrupcionAudioRequest =
  | { aireToken: string; texto: string; voiceId: string }
  | { aireToken: string; cunaId: string };

// GET /api/aire/dj-interrupcion/cunas?token=
type DjInterrupcionCunasResponse = {
  cunas: Array<{
    id: string;
    producto: string;
    anuncianteNombre: string;
    tieneAudio: boolean;
  }>;
};
```

Prisma additions on `SlotGrilla` and `EventoGrilla`:
- `presentacionCadaTemas Int @default(1)`
- `djHoraActiva Boolean @default(false)`
- `djHoraIntervaloMin Int?`
- `djClimaActivo Boolean @default(false)`
- `djClimaIntervaloMin Int?`
- `djPublicidadActiva Boolean @default(false)`
- `djPublicidadIntervaloMin Int?`

## Behavior

- En SlotForm (modo DJ): campo numérico "Cada cuántos temas" (min 1, default 1).
- Tres toggles con intervalo en minutos (min 5 si activo): Hora, Clima, Publicidad.
- Al guardar slot: si toggle activo, intervalo obligatorio.
- Calendario semanal: franjas finas en bloques DJ en offsets proyectados por tipo.
- Subtítulo del bloque DJ muestra leyenda H/C/P cuando corresponda.
- En `/aire` con slot DJ activo: presentación IA solo cada N temas configurados.
- Timer de hora: cada X min genera guión + TTS, overlay "La hora", fade out/in Spotify.
- Timer de clima: cada Y min, pronóstico sin mencionar ciudad/lugar.
- Timer de publicidad: cada Z min, rota cuñas activas; preferir audio pregrabado.
- Si hay transición de presentación en curso, posponer interrupción brevemente.
- Demo publicidad manual sigue funcionando.

## Notes

- Clima usa `Radio.ciudad` para fetch Open-Meteo; el guion Gemini debe prohibir nombrar el lugar.
- Reutilizar voz del slot (`voz1GeminiId`); fallback primera voz de la radio.
- Publicidad round-robin sobre cuñas con `esActiva = true`.

## AC
- [ ] Slot DJ guarda presentacionCadaTemas y toggles de interrupciones con intervalos
- [ ] Calendario semanal muestra franjas de interrupción proyectadas
- [ ] En /aire cada N temas hay presentación (N configurable)
- [ ] Hora se anuncia cada X minutos con overlay "La hora"
- [ ] Clima se anuncia cada Y minutos sin mencionar ciudad
- [ ] Publicidad rota cuñas cada Z minutos
- [ ] Demo publicidad manual sigue funcionando

## Changelog
- v1 (2026-06-12): Initial spec
