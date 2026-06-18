# Fix: Reproductor DJ no indica que la voz ya fue generada
> Status: DONE
> v1 | 2026-06-01

## Bug
Mientras se genera la voz de transición, el reproductor muestra "Generando voz…". Cuando la generación termina (`presentacionEstado === "lista"`), el indicador desaparece sin dejar ningún feedback visible. El operador no sabe si la voz está lista para la transición o si hubo un error silencioso.

## Root cause
`src/components/spotify/SpotifyPanel.tsx:773-784` — el JSX solo renderiza el badge cuando `presentacionEstado === "generando"`. Los estados `"lista"` e `"idle"` no tienen representación visual.

```tsx
{presentacionEstado === "generando" ?
  <span>Generando voz…</span>
: <span className="flex-1" />}
```

## Fix
- `src/components/spotify/SpotifyPanel.tsx` (bloque JSX del reproductor en modo aire, líneas 773-784): agregar un badge para `presentacionEstado === "lista"` con texto "Voz lista" y estilo visual diferenciado (color/ícono que indique listo, p. ej. verde tenue o neutro claro).
- El badge de `"lista"` debe desaparecer cuando `presentacionEstado` vuelve a `"idle"` (es decir, después de que la transición se ejecuta), comportamiento ya manejado por `runTransicion()` que llama `setPresentacionEstado("idle")`.
- No agregar badge para `"idle"` (estado normal, sin texto).

## Contracts
```ts
type PresentacionEstado = "idle" | "generando" | "lista";
// ya existe, no cambia
```

El badge se inserta en el mismo contenedor donde hoy vive "Generando voz…" (entre el tiempo elapsed y el tiempo total de la barra de progreso).

## Verify
1. Abrir `/aire?token=...` con sesión DJ y voz configurada.
2. Al arrancar la primera canción, verificar que aparece "Generando voz…".
3. Esperar a que la generación termine (puede tardar entre 5-20 s según ElevenLabs).
4. Verificar que el badge cambia a "Voz lista" (o equivalente) sin desaparecer hasta que la transición se ejecuta.
5. Al ejecutarse la transición, verificar que el badge desaparece.

## Changelog
- v1 (2026-06-01): diagnóstico inicial
