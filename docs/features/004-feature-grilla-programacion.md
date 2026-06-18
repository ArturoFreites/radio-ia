# Feature: Grilla de programación + pre-generación automática
> Status: DONE
> v1 | 2026-05-13

## Why
La radio debe funcionar autónoma: la grilla define qué se emite y cuándo, y el sistema pre-genera el audio de los programas antes de que llegue su hora.

## Files

### Create
- `prisma/migrations/` — migración para `SlotGrilla`, `EventoGrilla`, `TipoSlot`
- `src/app/(dashboard)/grilla/page.tsx` — página de gestión de grilla para el operador
- `src/app/api/grilla/slots/route.ts` — `GET` lista slots, `POST` crea slot semanal
- `src/app/api/grilla/slots/[id]/route.ts` — `DELETE` elimina slot
- `src/app/api/grilla/eventos/route.ts` — `GET` lista eventos, `POST` crea evento puntual
- `src/app/api/grilla/eventos/[id]/route.ts` — `DELETE` elimina evento
- `src/app/api/grilla/hoy/route.ts` — `GET` devuelve la grilla del día con estado de cada slot
- `src/app/api/aire/estado/route.ts` — `GET` devuelve qué debería estar sonando ahora mismo
- `src/components/grilla/GrillaEditor.tsx` — UI de gestión (cliente)
- `src/components/grilla/SlotForm.tsx` — formulario crear/editar slot
- `worker/processors/preGeneracion.ts` — procesador del job de pre-generación
- `worker/jobs/preGeneracionScheduler.ts` — job BullMQ repeatable que revisa la grilla

### Modify
- `prisma/schema.prisma` — agregar modelos y enum
- `src/components/dashboard/Sidebar.tsx` — agregar link "Grilla" a `/grilla`
- `worker/index.ts` — registrar worker de pre-generación

## Contracts

```prisma
enum TipoSlot {
  PROGRAMA
  DJ
}

model SlotGrilla {
  id                String    @id @default(cuid())
  radioId           String
  radio             Radio     @relation(fields: [radioId], references: [id], onDelete: Cascade)
  diaDeSemana       Int       // 0=domingo … 6=sábado
  horaInicio        String    // "HH:MM" en timezone de la radio (Argentina = UTC-3)
  duracionMin       Int
  tipo              TipoSlot
  programaId        String?
  programa          Programa? @relation(fields: [programaId], references: [id], onDelete: SetNull)
  anticipacionHoras Int       @default(2)
  esActivo          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model EventoGrilla {
  id                String    @id @default(cuid())
  radioId           String
  radio             Radio     @relation(fields: [radioId], references: [id], onDelete: Cascade)
  fecha             DateTime  // día específico (fecha sin hora, hora en horaInicio)
  horaInicio        String    // "HH:MM"
  duracionMin       Int
  tipo              TipoSlot
  programaId        String?
  programa          Programa? @relation(fields: [programaId], references: [id], onDelete: SetNull)
  anticipacionHoras Int       @default(2)
  createdAt         DateTime  @default(now())
}
```

```typescript
// GET /api/grilla/hoy
type SlotHoy = {
  id: string
  tipo: 'PROGRAMA' | 'DJ'
  horaInicio: string        // "HH:MM"
  duracionMin: number
  programa?: {
    id: string
    nombre: string
    estado: EstadoPrograma  // indica si el audio está listo
  }
  origen: 'slot' | 'evento' // si viene de plantilla semanal o override
}
type GrillaHoyResponse = { slots: SlotHoy[] }

// GET /api/aire/estado
type EstadoAire = {
  ahora: SlotHoy | null          // slot activo en este momento, null si no hay ninguno
  siguiente: SlotHoy | null      // próximo slot del día
  segundosHastaFin: number | null    // segundos hasta que termina el slot actual
  segundosHastaSiguiente: number | null  // segundos hasta que empieza el siguiente
}
```

## Behavior

**Gestión de grilla (operador)**
- El operador accede a `/grilla` y ve una vista semanal (lunes-domingo) con los slots de cada día
- Puede agregar un slot semanal: elige día, hora de inicio, duración, tipo (PROGRAMA o DJ), y si es PROGRAMA elige qué programa de su lista
- Puede agregar un evento puntual: elige fecha específica, resto igual
- Un evento puntual en la misma franja que un slot semanal tiene prioridad (override)
- Puede eliminar slots y eventos
- Los slots de tipo DJ no necesitan programa asociado
- Anticipación configurable por slot (por defecto 2 horas)

**Pre-generación automática (worker)**
- Job BullMQ repeatable que corre cada 15 minutos en el worker
- Para cada radio activa, busca slots/eventos de tipo PROGRAMA en la ventana [ahora, ahora + anticipacionHoras]
- Si el programa del slot tiene estado distinto de LISTO y no hay una generación activa → encola `generar-programa` (mismo job que ya existe)
- Para bloques de tipo NOTICIA dentro de ese programa: si tienen `urlNoticia` en su config y no tienen `audioUrl` → el job de generación ya los procesa frescos (el contenido es la URL del momento)
- Loguea en consola qué programas puso en cola y cuáles ya están listos
- No encola si ya hay una Generacion con estado EN_COLA o PROCESANDO para ese programa

**Estado del aire (API)**
- `GET /api/aire/estado` no requiere autenticación (se usa desde la Página de Aire con token)
- Calcula el slot activo comparando la hora actual contra los slots/eventos del día (eventos tienen prioridad)
- Devuelve también el siguiente slot para que la página sepa cuándo cambiar de modo

## Notes

- El timezone de toda la grilla es America/Argentina/Buenos_Aires (UTC-3 fijo). No hay configuración de timezone por radio en esta versión.
- Si dos slots se solapan, gana el de menor `horaInicio` (no solapar es responsabilidad del operador — no hay validación de solapamiento en v1)
- El job repeatable se registra con `jobId: 'pre-generacion-[radioId]'` para evitar duplicados
- Los `EventoGrilla` no se auto-eliminan al pasar la fecha — el operador los borra manualmente

## AC
- [ ] El operador crea un slot semanal "Lunes 08:00, 120 min, Programa Matinal" y aparece en la vista semanal
- [ ] El operador crea un evento puntual para el 2026-05-20 y aparece diferenciado del slot semanal
- [ ] Con 2 horas de anticipación, el worker encola la generación del programa automáticamente
- [ ] `GET /api/aire/estado` devuelve el slot activo en este momento con `segundosHastaFin` correcto
- [ ] Si el programa del slot no está LISTO al llegar su hora, `ahora.programa.estado` lo indica y la Página de Aire puede reaccionar

## Changelog
- v1 (2026-05-13): spec inicial
