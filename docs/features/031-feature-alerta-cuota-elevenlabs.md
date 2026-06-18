# Feature: Alerta de cuota ElevenLabs
> Status: DONE
> v1 | 2026-05-26

## Why
Cuando los créditos de ElevenLabs se agotan, el worker falla silenciosamente en producción y el programa sale al aire sin audio. Se necesita visibilidad antes de que eso ocurra.

## Files

### Create
- `src/lib/elevenlabs/quota.ts` — consulta `GET /v1/user/subscription` y devuelve créditos restantes
- `src/app/api/elevenlabs/quota/route.ts` — endpoint GET protegido por sesión, delega a `quota.ts`
- `src/components/dashboard/CuotaElevenLabsAlerta.tsx` — banner de alerta visible en el dashboard

### Modify
- `src/app/(dashboard)/dashboard/page.tsx` — incluir `CuotaElevenLabsAlerta`
- `worker/processors/preGeneracion.ts` — verificar cuota antes de encolar; si insuficiente, loguear con prefijo `[ALERTA CUOTA]` y omitir el encolamiento

## Contracts

```ts
// quota.ts
export type ElevenLabsQuota = {
  creditosRestantes: number;   // character_limit - character_count
  creditosTotal: number;        // character_limit
  porcentajeUsado: number;      // 0–100
};

export async function consultarCuotaElevenLabs(): Promise<ElevenLabsQuota>
```

```ts
// GET /api/elevenlabs/quota
// Response 200: ElevenLabsQuota
// Response 503: { error: string }  — si la API de ElevenLabs falla
```

## Behavior

- `consultarCuotaElevenLabs` llama a `https://api.elevenlabs.io/v1/user/subscription` con `xi-api-key: ELEVENLABS_API_KEY`. Calcula `creditosRestantes = character_limit - character_count`.
- El endpoint `/api/elevenlabs/quota` requiere sesión activa (`getSessionRadioId`). Si `ELEVENLABS_API_KEY` no está configurada, devuelve 503 con mensaje claro.
- `CuotaElevenLabsAlerta` hace fetch a `/api/elevenlabs/quota` en el cliente. Si `creditosRestantes < UMBRAL_ALERTA` (ver Notas), muestra un banner de advertencia con el valor exacto de créditos restantes. Si `creditosRestantes === 0`, muestra estado de error. Si los créditos están bien, no renderiza nada.
- En `preGeneracion.ts`, antes de encolar un programa, llamar a `consultarCuotaElevenLabs`. Si `creditosRestantes < UMBRAL_BLOQUEO` (ver Notas), hacer `console.error('[ALERTA CUOTA] radio=... programa=... créditos insuficientes: X restantes')` y no encolar ese programa en este ciclo.

## Notes

- `UMBRAL_ALERTA`: `process.env.ELEVENLABS_QUOTA_ALERTA_MIN ?? 500`. Por debajo de este valor el banner aparece.
- `UMBRAL_BLOQUEO`: `process.env.ELEVENLABS_QUOTA_BLOQUEO_MIN ?? 100`. Por debajo de este valor el worker no encola (evita acumular jobs que van a fallar).
- El banner no bloquea la UI — es informativo. El usuario puede seguir navegando.
- `consultarCuotaElevenLabs` se usa tanto en el endpoint HTTP como en el worker. No cachear en el worker (cada ciclo de pre-generación debe reflejar el estado real).
- La ElevenLabs API llama desde el worker no afectan los créditos (es una consulta de metadata).
- Si la consulta de cuota falla (red, timeout), el worker debe loguear el error pero igual encolar el programa — el fallo de cuota no debe bloquear si es un error transitorio de red.

## AC
- [ ] El dashboard muestra un banner amarillo con créditos restantes cuando están por debajo del umbral
- [ ] El dashboard muestra un banner rojo cuando los créditos son 0
- [ ] Con créditos suficientes no se renderiza ningún banner
- [ ] El worker imprime `[ALERTA CUOTA]` en consola cuando los créditos son insuficientes
- [ ] Con créditos < umbral de bloqueo, el worker no encola el programa (verificable via logs)
- [ ] Si `ELEVENLABS_API_KEY` no está configurada, el endpoint devuelve 503 sin romper el dashboard

## Changelog
- v1 (2026-05-26): spec inicial
