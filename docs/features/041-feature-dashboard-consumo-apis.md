# Feature: Dashboard — consumo Gemini y ElevenLabs
> Status: DONE
> v2 | 2026-06-12

## Why
El dashboard solo alerta cuando ElevenLabs está bajo; no hay visibilidad del gasto acumulado ni de tokens Gemini. Se necesita ver uso y costo estimado de ambos proveedores desde el control room.

## Files

### Create
- `prisma/migrations/20260612140000_consumo_api/migration.sql` — tabla de registros de consumo
- `src/lib/consumo/constants.ts` — tarifas configurables por env (Gemini input/output, ElevenLabs por 1k chars)
- `src/lib/consumo/registrar.ts` — persistir evento y calcular costo estimado USD
- `src/lib/consumo/resumen.ts` — agregar consumo por radio y periodo (mes actual)
- `src/app/api/consumo/resumen/route.ts` — GET protegido por sesión
- `src/components/dashboard/ConsumoApisPanel.tsx` — tarjetas de Gemini + ElevenLabs con barras de progreso

### Modify
- `prisma/schema.prisma` — modelo `ConsumoApiRegistro`
- `src/lib/gemini/guiones.ts` — registrar tokens desde `usageMetadata` tras cada `generateContent`
- `src/lib/noticias/scraper.ts` — registrar tokens tras extracción de noticia
- `src/lib/elevenlabs/tts.ts` — registrar caracteres consumidos tras TTS exitoso
- `src/lib/elevenlabs/quota.ts` — extender tipo con `creditosUsados` y `tier` si la API lo devuelve
- `src/lib/gemini/tts.ts` — registrar caracteres en `generateWithElevenLabs` (ruta alternativa de TTS)
- `src/app/(dashboard)/dashboard/page.tsx` — incluir `ConsumoApisPanel` debajo de `StatsRow`
- `src/components/dashboard/CuotaElevenLabsAlerta.tsx` — sin cambios de comportamiento (solo alerta baja cuota)

## Contracts

```ts
enum ProveedorConsumo {
  GEMINI
  ELEVENLABS
}

enum TipoConsumoApi {
  TEXTO
  VOZ
}

// Prisma: ConsumoApiRegistro
// id, radioId, proveedor, tipo, tokensEntrada?, tokensSalida?, caracteres?, costoEstimadoUsd, modelo?, createdAt

export type ResumenConsumoApis = {
  periodo: { desde: string; hasta: string }; // ISO date
  gemini: {
    tokensEntrada: number;
    tokensSalida: number;
    costoEstimadoUsd: number;
    llamadas: number;
  };
  elevenlabs: {
    caracteresRegistrados: number; // suma local del mes (desde registros)
    costoEstimadoUsd: number;
    llamadas: number;
    suscripcion: ElevenLabsQuota | null; // cuota global de la cuenta API
  };
};

// ElevenLabsQuota extendido
export type ElevenLabsQuota = {
  creditosRestantes: number;
  creditosTotal: number;
  creditosUsados: number;
  porcentajeUsado: number;
};
```

```ts
// GET /api/consumo/resumen
// Response 200: ResumenConsumoApis
// Response 401: { error: string }
```

## Behavior

- Tras cada llamada exitosa a Gemini (`generateContent`), leer `usageMetadata` del response (`promptTokenCount`, `candidatesTokenCount`, `thoughtsTokenCount` si existe). Persistir un `ConsumoApiRegistro` con `proveedor=GEMINI`, `tipo=TEXTO`, tokens y costo estimado según tarifas de `GEMINI_COST_INPUT_USD_PER_1M` y `GEMINI_COST_OUTPUT_USD_PER_1M` (defaults: 0.30 y 2.50 para gemini-2.5-flash, junio 2026).
- Tras cada TTS ElevenLabs exitoso, persistir registro con `proveedor=ELEVENLABS`, `tipo=VOZ`, `caracteres=text.length`, costo según `ELEVENLABS_COST_USD_PER_1K_CHARS` (default 0.10 para multilingual v2).
- `registrarConsumo` recibe `radioId` cuando está disponible en el worker/contexto; si no hay radioId (ruta sin tenant), usar cadena vacía o omitir — en worker siempre hay radioId del job.
- `GET /api/consumo/resumen` agrega registros del mes calendario actual (timezone Argentina) filtrados por `radioId` de la sesión. Además consulta `consultarCuotaElevenLabs()` para datos de suscripción global.
- `ConsumoApisPanel` muestra dos tarjetas en grid (como `StatsRow`):
  - **Gemini**: tokens entrada + salida del mes, costo estimado USD, subtítulo "mes actual".
  - **ElevenLabs**: barra de progreso créditos usados/total (desde suscripción), caracteres generados este mes (registros locales), costo estimado USD del mes.
- Si falla la consulta de suscripción ElevenLabs, la tarjeta muestra solo datos de registros locales con nota "Suscripción no disponible".
- Si no hay registros Gemini aún, mostrar "0 tokens" — no ocultar la tarjeta.
- Los costos son **estimados** (label visible "estimado") porque las tarifas reales dependen del plan y Google AI Studio no expone billing por API.

## Notes

- Google **no** ofrece API programática de billing agregado (solo dashboard en AI Studio, junio 2026). El tracking de Gemini es obligatoriamente acumulativo desde que se despliega esta feature — no hay histórico retroactivo.
- ElevenLabs `GET /v1/user/subscription` es a nivel cuenta API (una key por deploy), no por tenant. Los registros Prisma sí permiten atribuir por `radioId` el consumo generado por cada radio.
- `CuotaElevenLabsAlerta` sigue mostrándose solo bajo umbral; el panel nuevo muestra cuota siempre.
- Tarifas en env para no hardcodear: `GEMINI_COST_INPUT_USD_PER_1M`, `GEMINI_COST_OUTPUT_USD_PER_1M`, `ELEVENLABS_COST_USD_PER_1K_CHARS`.
- Referencia tokens Gemini: https://ai.google.dev/gemini-api/docs/tokens
- Referencia cuota ElevenLabs: ya implementada en feature 031.

## AC
- [ ] Dashboard muestra tarjeta Gemini con tokens entrada/salida del mes y costo estimado USD
- [ ] Dashboard muestra tarjeta ElevenLabs con créditos usados/total de suscripción y barra de progreso
- [ ] Tras generar un bloque en el worker, `/api/consumo/resumen` refleja incremento en tokens Gemini y/o caracteres ElevenLabs
- [ ] Usuario sin sesión recibe 401 en `/api/consumo/resumen`
- [ ] Costos muestran leyenda "estimado"

## Changelog
- v1 (2026-06-12): Initial spec
- v2 (2026-06-12): Selector semanal/mensual en panel y API
