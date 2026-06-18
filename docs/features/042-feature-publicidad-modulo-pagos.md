# Feature: Módulo Publicidad con control mensual de pagos
> Status: DONE
> v1 | 2026-06-12

## Why
Los anunciantes y cuñas están mezclados con Locutores; la radio necesita un módulo dedicado de Publicidad con seguimiento mensual de cobros.

## Files

### Create
- `prisma/migrations/20260612160000_publicidad_pagos_mensuales/migration.sql` — campos y tabla de pagos
- `src/types/publicidad.ts` — tipos de pagos y resumen mensual
- `src/lib/publicidad/format.ts` — formateo de montos ARS
- `src/app/(dashboard)/publicidad/page.tsx` — página del módulo
- `src/components/publicidad/PublicidadManager.tsx` — shell con tabs Catálogo / Pagos
- `src/components/publicidad/PublicidadCatalogo.tsx` — catálogo de clientes y cuñas (antes AnunciantesManager)
- `src/components/publicidad/PublicidadPagosPanel.tsx` — vista mensual de cobros
- `src/app/api/publicidad/pagos/route.ts` — GET resumen del mes
- `src/app/api/publicidad/pagos/[id]/route.ts` — PATCH estado/monto/fecha/notas
- `src/app/api/anunciantes/[id]/route.ts` — PATCH montoMensual y datos del cliente

### Modify
- `prisma/schema.prisma` — `montoMensual` en Anunciante; modelo `PublicidadPagoMensual`; enum `EstadoPagoPublicidad`
- `src/components/dashboard/Sidebar.tsx` — enlace Publicidad en gestión
- `src/components/dashboard/LocutoresStaff.tsx` — quitar tab de anunciantes
- `src/app/(dashboard)/locutores/page.tsx` — dejar de cargar anunciantes
- `src/app/(dashboard)/anunciantes/page.tsx` — redirect a `/publicidad`
- `src/middleware.ts` — proteger `/publicidad`
- `src/components/grilla/SlotForm.tsx` — link a Publicidad

### Delete
- `src/components/dashboard/AnunciantesManager.tsx` — reemplazado por PublicidadCatalogo

## Contracts

```typescript
enum EstadoPagoPublicidad {
  PENDIENTE
  PAGADO
  PARCIAL
}

// Anunciante: campo nuevo montoMensual Float? (monto acordado por mes)

model PublicidadPagoMensual {
  id           String
  anuncianteId String
  anio         Int      // ej. 2026
  mes          Int      // 1-12
  monto        Float?   // monto cobrado en el mes
  estado       EstadoPagoPublicidad @default(PENDIENTE)
  fechaPago    DateTime?
  notas        String?
  @@unique([anuncianteId, anio, mes])
}

// GET /api/publicidad/pagos?anio=2026&mes=6
type ResumenPagosPublicidad = {
  periodo: { anio: number; mes: number; etiqueta: string };
  totales: { acordado: number; cobrado: number; pendiente: number; pagados: number; totalClientes: number };
  filas: Array<{
    pagoId: string;
    anuncianteId: string;
    nombre: string;
    rubro: string | null;
    esActivo: boolean;
    montoAcordado: number | null;
    monto: number | null;
    estado: EstadoPagoPublicidad;
    fechaPago: string | null;
    notas: string | null;
  }>;
};

// PATCH /api/publicidad/pagos/[id]
{ estado?: EstadoPagoPublicidad; monto?: number; fechaPago?: string | null; notas?: string | null }

// PATCH /api/anunciantes/[id]
{ montoMensual?: number | null; esActivo?: boolean; ...campos existentes opcionales }
```

## Behavior

- Sidebar muestra **Publicidad** (`/publicidad`) en la sección Gestión; desaparece el tab de anunciantes en Locutores.
- `/anunciantes` redirige a `/publicidad`.
- La página Publicidad tiene dos tabs: **Catálogo** (clientes + cuñas, mismas funciones que antes) y **Pagos**.
- En Catálogo, al crear/editar un cliente se puede definir **Monto mensual acordado** (opcional).
- Tab Pagos: selector de mes/año (mes actual por defecto); flechas anterior/siguiente.
- Al abrir un mes, el sistema asegura un registro de pago por cada cliente activo de la radio (upsert con estado PENDIENTE).
- Resumen superior con tarjetas: Total acordado, Cobrado, Pendiente, Clientes pagados / total.
- Tabla por cliente: nombre, rubro, monto acordado, monto cobrado, estado (badge), fecha de pago, acciones.
- Marcar como **Pagado** rellena monto con el acordado si existe, fecha con hoy, y estado PAGADO.
- Estado **Parcial** cuando el monto cobrado es menor al acordado; **Pagado** cuando es igual o mayor.
- Editar monto cobrado, fecha y notas inline o en fila expandida.
- APIs de `/api/anunciantes/*` siguen funcionando (sin renombrar modelos Prisma).

## Notes

- No renombrar modelos Prisma `Anunciante`/`Cuna` — solo la UI dice "cliente de publicidad" / "Publicidad".
- Montos en ARS; formatear con locale es-AR.
- Multi-tenant: todos los queries filtran por `radioId` vía relación anunciante.

## AC
- [ ] Sidebar tiene enlace Publicidad; Locutores ya no muestra tab de anunciantes
- [ ] `/publicidad` muestra catálogo con cuñas igual que antes
- [ ] Tab Pagos muestra resumen y tabla del mes seleccionado
- [ ] Marcar un cliente como pagado persiste y actualiza totales
- [ ] `/anunciantes` redirige a `/publicidad`

## Changelog
- v1 (2026-06-12): Initial spec
