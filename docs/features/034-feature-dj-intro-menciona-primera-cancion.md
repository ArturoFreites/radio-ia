# Feature: Intro-apertura DJ menciona la primera canción
> Status: DONE
> v1 | 2026-05-26

## Why
Cuando el modo DJ arranca y reproduce la intro de apertura, el locutor debe mencionar cuál es el primer tema que va a sonar, para que suene a radio en vivo real y no a un saludo genérico.

## Files

### Modify
- `src/lib/spotify/prompts.ts` — `buildIntroAperturaPrompt`: incluir `primeraCancion` en el prompt cuando está disponible
- `src/lib/spotify/generarIntroApertura.ts` — aceptar `playlistId` opcional; si está presente, buscar el primer track de la playlist antes de generar el guion
- `src/app/api/spotify/sesion/[id]/intro-apertura/route.ts` — aceptar `playlistId` en el body y pasarlo a `generarIntroApertura`
- `src/components/spotify/SpotifyPanel.tsx` — incluir `playlistId` en el body del POST a `/intro-apertura`

## Contracts

```typescript
// generarIntroApertura.ts — nueva firma
async function generarIntroApertura(
  sesionId: string,
  playlistId?: string | null,
): Promise<string | null>
```

```typescript
// route.ts — body schema ampliado
const bodySchema = z.object({
  panelToken: z.string().min(1),
  playlistId: z.string().optional(),
});
```

```typescript
// buildIntroAperturaPrompt — campo nuevo en config
primeraCancion?: { nombre: string; artista: string }
// El prompt lo usa para cerrar con: "...y arrancamos con [nombre] de [artista]."
```

## Behavior

- Cuando el `SpotifyPanel` dispara la intro-apertura, incluye el `playlistId` en el body del POST.
- El servidor llama a `fetchPlaylistTracksFirstPage` (función ya existente en `spotify/api.ts`) para obtener el primer track de la playlist.
- Si la playlist está vacía o la llamada falla, se genera la intro sin mención de canción (comportamiento de fallback silencioso).
- El prompt de intro-apertura incluye una instrucción para cerrar con una frase del tipo: "...y arrancamos con '[nombre]' de [artista]."
- La lógica de caché de 30 min en `generarIntroApertura` no cambia: si el audio ya existe y es reciente, se retorna sin regenerar.
- Si `primeraCancion` llega vacío o null, el prompt genera una intro genérica como hasta ahora.

## Notes

- `fetchPlaylistTracksFirstPage` ya existe en `src/lib/spotify/api.ts` y devuelve `SpotifyTrackItem[]`. Usar `[0]` para la primera canción.
- `generarIntroApertura` ya llama a `getAccessTokenFresco(sesion.conexion)` internamente — el access token ya está disponible para llamar a la playlist API sin cambios de autenticación.
- El cache a 30 min usa el `sesionId` como clave del archivo (`intro-${sesionId}.mp3`). Si la sesión es nueva, el cache ya es inválido y regenera con el primer track correcto.
- `ejecutarIntroApertura` en `SpotifyPanel.tsx` recibe `playlistId` vía el prop del componente (ya disponible como `playlistId`); solo hay que incluirlo en el body del fetch.
- La función `fetchPlaylistTracksFirstPage` puede devolver 403 si la playlist no es propia del usuario. En ese caso el error se captura en el bloque `try/catch` existente y se genera intro sin canción.

## AC
- [ ] Al iniciar el modo DJ, la intro-apertura menciona el nombre de la primera canción y su artista
- [ ] Si la playlist está vacía o falla la consulta, la intro se genera sin mención de canción (sin error visible)
- [ ] El texto del guion guardado en DB (o en el audio generado) termina con una referencia a la primera canción
- [ ] La caché de 30 min sigue funcionando: una segunda carga del panel dentro de 30 min no regenera el audio

## Changelog
- v1 (2026-05-26): spec inicial
