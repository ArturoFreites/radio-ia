# Feature: Dashboard rediseño — control room
> Status: DONE
> v1 | 2026-05-25

## Why
El dashboard actual muestra 2 stats estáticos y no comunica nada del estado real de la radio. Necesita ser el panel de control central: qué está al aire ahora, qué viene después, y acceso rápido a las acciones frecuentes.

## Files

### Modify
- `src/app/(dashboard)/dashboard/page.tsx` — reemplazar contenido con las secciones definidas abajo
- `src/app/api/aire/estado/route.ts` — verificar que devuelve `online: boolean` consultable desde server component

### Create
- `src/components/dashboard/VivoBanner.tsx` — bloque en vivo (programa actual + countdown + estado stream)
- `src/components/dashboard/ProximosSlots.tsx` — lista de próximos slots del día
- `src/components/dashboard/UltimosProgramas.tsx` — lista de últimos programas generados
- `src/components/dashboard/StatsRow.tsx` — fila de métricas (programas, generaciones, horas)

## Contracts

```ts
// Props de VivoBanner
type VivoBannerProps = {
  programaActual: { nombre: string; horaInicio: string; horaFin: string } | null;
  proximoPrograma: { nombre: string; horaInicio: string } | null;
  streamOnline: boolean;
  aireToken: string | null;
};

// Props de ProximosSlots
type ProximosSlotsProps = {
  slots: Array<{
    id: string;
    nombre: string;
    horaInicio: string; // HH:mm
    horaFin: string;    // HH:mm
    estado: string;     // del programa asignado
  }>;
};
```

## Behavior

- El dashboard se divide en 4 zonas verticales: VivoBanner (hero) → StatsRow → grid de ProximosSlots + UltimosProgramas.
- **VivoBanner:**
  - Si hay un slot activo ahora según la grilla: muestra nombre del programa, horario, badge "EN VIVO" pulsante en rojo.
  - Si no hay slot activo: muestra "Sin programa al aire" con badge gris.
  - Countdown al próximo programa (siguiente slot del día) usando un componente client con `setInterval` cada segundo.
  - Indicador de stream: hace un fetch a `/api/aire/estado` para saber si el stream Icecast está online. Badge verde "STREAM ON" o rojo "STREAM OFF".
  - Botón "IR AL AIRE" visible siempre si `aireToken` existe — redirige a `/aire?token=...` en nueva pestaña.
- **StatsRow:** 3 tarjetas — total de programas, total de generaciones, horas de audio generado.
- **ProximosSlots:** muestra los próximos 5 slots del día desde ahora usando `/api/grilla/hoy`. Si no hay más slots, mensaje "No hay más programas hoy".
- **UltimosProgramas:** últimos 5 programas ordenados por `updatedAt`, con nombre, estado y link al editor.
- Todo el fetch de datos ocurre en el server component `dashboard/page.tsx`. Los componentes reciben props — ninguno hace fetch propio excepto `VivoBanner` para el countdown (client component).

## Notes

- El countdown es client-only (usa `Date.now()` en el browser). El server component calcula `proximoPrograma.horaInicio` y lo pasa como prop string ISO.
- `streamOnline` puede obtenerse intentando un HEAD a la URL de Icecast desde el servidor o usando la ruta `/api/aire/estado` existente. Si falla la consulta, asumir `false` — no romper el render.
- La grilla usa timezone `America/Argentina/Buenos_Aires` — usar `date-fns-tz` o la lógica ya existente en el worker para comparar slots.

## AC
- [ ] Al cargar el dashboard, se ve el nombre del programa actual si hay un slot activo en este momento según la grilla
- [ ] Se muestra un countdown en tiempo real al próximo slot del día
- [ ] El badge "STREAM ON/OFF" refleja si el endpoint /api/aire/estado reporta online
- [ ] El botón "IR AL AIRE" lleva a /aire con el token correcto en nueva pestaña
- [ ] Las stats muestran totales reales de la radio logueada
- [ ] Los próximos 5 slots del día aparecen en orden cronológico
- [ ] Los últimos 5 programas aparecen con nombre, estado y link al editor

## Changelog
- v1 (2026-05-25): spec inicial
