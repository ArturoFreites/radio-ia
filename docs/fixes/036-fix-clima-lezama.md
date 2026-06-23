# Fix: Clima DJ siempre para Lezama
> Status: DONE
> v1 | 2026-06-22

## Bug
La interrupción de clima del DJ no genera guion (o muestra datos incorrectos). Si `Radio.ciudad` es "Lezama" o "Lezama, Argentina", Open-Meteo geocodifica mal (España o sin resultados).

## Root cause
`src/lib/entretenimiento/clima.ts` — geocoding por nombre de ciudad sin filtrar país; "Lezama" resuelve a España y "Lezama, Argentina" no devuelve resultados.

## Fix
- Usar coordenadas fijas de Lezama, Partido de Lezama, Buenos Aires, Argentina (-35.87458, -57.8973) vía Open-Meteo.
- Ignorar el parámetro de ciudad para el fetch (el guion sigue sin nombrar el lugar).
- Validar respuesta de la API antes de serializar; registrar error en catch.
- Actualizar seed de Radio Dejavu: `ciudad="Lezama"`, `provincia="Buenos Aires"`.

## Verify
1. Llamar `fetchClima()` desde Node o activar interrupción CLIMA en aire.
2. Debe devolver JSON con temperatura, máxima, mínima y código WMO válidos (no "Sin datos de clima.").
3. El guion Gemini se genera y la interrupción se reproduce.

## Changelog
- v1 (2026-06-22): Geocoding erróneo para Lezama; fijar coordenadas AR
