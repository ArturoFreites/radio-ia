# Fix: El siguiente slot no aparece cuando cruza la medianoche
> Status: DONE
> v1 | 2026-05-25

## Bug
Después de las 23:59 (hora Argentina), `siguienteSlot()` devuelve `null` aunque haya un slot programado para las 00:30 del día siguiente. La UI del vivo queda en IDLE con "Sin programación activa" durante toda la madrugada hasta que el próximo poll detecta el nuevo slot activo.

Reproducir: configurar un slot a las 00:30. A las 23:50, `GET /api/aire/estado` devuelve `siguiente: null` y `segundosHastaSiguiente: null` aunque haya programación inminente.

## Root cause

`src/lib/grilla/mergeDia.ts:50` — `mergeSlotsDelDiaArgentina` solo construye la lista de slots del día actual (weekday de hoy). `siguienteSlot()` en la misma línea 91 solo busca dentro de esa lista con `horaInicio > ahoraMin`. Si no hay slots futuros hoy, retorna `null` sin considerar el día siguiente.

## Fix

En `src/app/api/aire/estado/route.ts`, después de calcular `sig = siguienteSlot(slots, ahora)`:
- Si `sig === null`, calcular los slots de mañana (weekday + 1, mod 7) usando las mismas reglas de merge.
- Tomar el primer slot de mañana ordenado por hora (el que tenga menor `horaInicio`) como "siguiente".
- Calcular `segundosHastaSiguiente` para ese slot: `(minutos que faltan hasta medianoche + minutos del slot en el día siguiente) * 60`.
- Si tampoco hay slots mañana, `siguiente` sigue siendo `null`.

El fix es solo en el endpoint; no requiere cambios en el cliente.

## Verify

1. Configurar un slot semanal a las 00:30 en un día de semana.
2. Simular (o esperar) las 23:50 del día anterior.
3. `GET /api/aire/estado` → `siguiente.horaInicio` debe ser `"00:30"` y `segundosHastaSiguiente` debe ser ~2400 (40 minutos).
4. En la UI del vivo, la `GrillaHoy` sidebar muestra el slot de 00:30 como "siguiente".

## Changelog
- v1 (2026-05-25): spec inicial
