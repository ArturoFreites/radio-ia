# Feature: Selector de voces desde la API de ElevenLabs
> Status: DONE
> v1 | 2026-05-25

## Why
El operador no puede saber qué voice IDs tiene disponibles sin salir de la plataforma. El campo de texto libre para ingresar un ID de ElevenLabs manualmente es propenso a errores y obliga al operador a copiar IDs desde el panel de ElevenLabs.

## Files

### Create
- `src/app/api/voces/elevenlabs/route.ts` — proxy `GET` que devuelve las voces del account ElevenLabs configurado en el `.env`

### Modify
- `src/components/dashboard/VocesManager.tsx` — reemplazar el campo de texto `eventlabsVoiceId` por un `<select>` que lista voces desde `/api/voces/elevenlabs`; el campo de texto queda como fallback si la API falla
- `src/app/api/voces/route.ts` — mantener el endpoint sin cambios de contrato; solo se modifica la UI del formulario

## Contracts

```typescript
// GET /api/voces/elevenlabs
// Requiere sesión activa (getSessionRadioId)
type ElevenLabsVozItem = {
  voice_id: string
  name: string
  preview_url: string | null
  labels: Record<string, string>  // ej. { accent: "american", gender: "male" }
}
type ElevenLabsVocesResponse = {
  voces: ElevenLabsVozItem[]
}
```

## Behavior

- Al cargar el formulario de agregar voz, se hace `GET /api/voces/elevenlabs` y se muestra un `<select>` con las voces disponibles en la cuenta ElevenLabs.
- Cada opción muestra el nombre de la voz y sus etiquetas principales (género, acento).
- Al seleccionar una voz del `<select>`, el campo `nombre` se pre-rellena con el nombre de la voz si está vacío.
- Si la API de ElevenLabs no responde o `ELEVENLABS_API_KEY` no está configurada, el `<select>` se reemplaza por un campo de texto libre (comportamiento actual) y se muestra un aviso: "No se pudo conectar con ElevenLabs. Ingresá el voice ID manualmente."
- Junto a cada voz en el `<select>` hay un botón "Escuchar" que reproduce el `preview_url` de esa voz (si existe) antes de seleccionarla.
- El formulario sigue funcionando igual al guardar: envía el `voice_id` seleccionado a `POST /api/voces`.

## Notes

- `ELEVENLABS_API_KEY` ya existe en el entorno. No hay variables nuevas.
- El proxy server-side evita exponer la API key al cliente.
- Las voces de ElevenLabs incluyen voces del plan y voces clonadas del usuario. Mostrar todas sin filtrar.
- El `preview_url` es una URL pública de ElevenLabs; se puede reproducir directamente con `new Audio(preview_url).play()` desde el cliente.

## AC
- [ ] El formulario de agregar voz muestra un `<select>` con las voces de la cuenta ElevenLabs, no un campo de texto.
- [ ] Al seleccionar una voz, el campo nombre se pre-rellena con el nombre de ElevenLabs.
- [ ] Al hacer clic en "Escuchar", se reproduce el preview de la voz seleccionada.
- [ ] Si la API no responde, el formulario muestra el campo de texto manual y un aviso.
- [ ] Guardar desde el `<select>` crea la voz correctamente (mismo comportamiento que antes).

## Changelog
- v1 (2026-05-25): spec inicial
