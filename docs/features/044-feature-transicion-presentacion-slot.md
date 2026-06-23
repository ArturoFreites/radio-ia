# Feature: Transición con presentación al cambiar de slot DJ
> Status: DONE
> v1 | 2026-06-22

## Why
Al terminar un slot de la grilla y arrancar el siguiente, la música corta de golpe. Debe sonar una presentación IA con fade out/in, igual que entre canciones.

## Files

### Create
- `src/lib/spotify/generarTransicionSlot.ts` — guion Gemini + TTS para presentar el próximo programa/slot
- `src/app/api/aire/transicion-slot/route.ts` — genera y sirve audio de transición por slotId

### Modify
- `src/lib/spotify/prompts.ts` — `buildTransicionSlotPrompt`
- `src/components/spotify/SpotifyPanel.tsx` — mantener player vivo; `runTransicionSlot` con fades; no reinit por cambio de sesión/playlist
- `src/components/spotify/PresentacionOverlay.tsx` — prop opcional `etiqueta` para el encabezado del overlay
- `src/components/aire/ModoDJ.tsx` — exponer `transicionarSlot` vía ref
- `src/components/aire/AireController.tsx` — prefetch y disparo de transición al acercarse el fin de slot

## Contracts

```typescript
// POST /api/aire/transicion-slot
type TransicionSlotRequest = { token: string; slotId: string };
type TransicionSlotResponse = {
  audioUrl: string | null;
  playlistId: string | null;
  playlistNombre: string;
  djNombre: string;
};

// SpotifyPanelHandle
transicionarSlot: (params: {
  playlistId: string;
  playlistNombre: string;
  audioUrl: string | null;
  djNombre?: string;
}) => Promise<void>;
```

## Behavior

- Cuando faltan ≤ 90 s para el fin del slot activo y existe `estado.siguiente`, prefetch del audio de transición (POST transicion-slot).
- Cuando faltan ≤ 3 s (o el slot activo cambió en el poll), si hay sesión DJ en curso:
  - Fade out Spotify 3000 ms → pausa
  - Overlay con etiqueta "Siguiente programa", título = nombre de playlist del slot entrante, subtítulo = DJ
  - Reproduce audio de transición si está listo; si no, continúa sin voz
  - Cambia contexto Spotify a la playlist del nuevo slot (position 0)
  - Fade in 2500 ms
- El player de Spotify **no** se desconecta ni recrea al cambiar `sesionId`/`playlistId`; solo refs y playlist.
- La intro de apertura sigue ejecutándose solo en el primer `ready` del player (montaje inicial).
- Si no hay slot siguiente, no hay transición automática.
- `estaOcupado()` incluye transición de slot en curso.

## Notes

- Cache de audio: `transicion-slot-{slotId}.mp3`, TTL 30 min (misma lógica que intro).
- No llamar `resolverSesionDj` en el prefetch; solo generar audio con voz del slot siguiente.
- El poll de `/api/aire/estado` sigue resolviendo la sesión nueva; el cliente actualiza refs sin reiniciar el SDK.

## AC
- [ ] Al pasar de un slot DJ al siguiente, la música hace fade out antes del cambio
- [ ] Se escucha presentación IA anunciando el programa entrante (si hay voz configurada)
- [ ] Overlay muestra "Siguiente programa" y nombre de la playlist
- [ ] Tras la voz, arranca la playlist del nuevo slot con fade in
- [ ] El player no se desconecta ni repite intro de apertura en el cambio de slot

## Changelog
- v1 (2026-06-22): Spec inicial
