# Feature: Progreso de generación visible en tiempo real
> Status: DONE
> v1 | 2026-05-26

## Why
Cuando el sistema genera contenido (programa completo, bloque, noticias) el usuario no ve qué está pasando y la UI puede mostrar estados intermedios sin contexto. La regla: nunca mostrar contenido hasta que esté listo; siempre mostrar progreso mientras se genera.

## Files

### Modify
- `src/app/api/aire/estado/route.ts` — incluir `generacionActiva` en `ProgramaAireEstado` cuando `programa.estado === 'GENERANDO'`
- `src/types/grilla.ts` — ampliar `ProgramaAireEstado` con el campo `generacionActiva`
- `src/components/aire/AireController.tsx` — mostrar overlay de generación cuando `programa.estado === 'GENERANDO'`; cambiar intervalo de polling a 3 s durante generación activa
- `src/app/(dashboard)/programas/[id]/page.tsx` — mostrar barra de progreso por bloque durante generación del programa; bloquear el botón "Generar" mientras hay generación en curso; poll a `/api/programas/[id]/estado` cada 3 s durante `GENERANDO`
- `src/app/api/programas/[id]/estado/route.ts` — incluir detalle de bloques (id, titulo, estado) en la respuesta durante `GENERANDO`

### Create
- `src/components/aire/GeneracionProgresOverlay.tsx` — overlay de generación para la página de aire

## Contracts

```typescript
// Ampliar en src/types/grilla.ts
type GeneracionActivaEstado = {
  estado: "EN_COLA" | "PROCESANDO" | "ERROR";
  bloquesTotal: number;
  bloquesListos: number;   // bloques en estado LISTO
  bloqueActualTitulo: string | null; // bloque en GENERANDO_GUION o GENERANDO_AUDIO
};

// ProgramaAireEstado — campo nuevo opcional
type ProgramaAireEstado = {
  id: string;
  panelToken: string | null;
  nombre: string;
  bloques: BloqueAireEstado[];
  generacionActiva?: GeneracionActivaEstado; // presente solo cuando programa.estado === 'GENERANDO'
};
```

```typescript
// /api/programas/[id]/estado — respuesta ampliada durante GENERANDO
{
  estado: string;
  generacion: {
    id: string;
    estado: string; // EN_COLA | PROCESANDO | COMPLETADA | ERROR
  } | null;
  bloques: {
    id: string;
    titulo: string;
    tipo: string;
    estado: string; // estado bloque: PENDIENTE | GENERANDO_GUION | GUION_LISTO | GENERANDO_AUDIO | LISTO | ERROR
    duracion: number | null;
    audioUrl: string | null;
  }[];
}
```

## Behavior

### Página de Aire — programa en generación
- Cuando `programa.estado === 'GENERANDO'`, el AireController no entra en modo PROGRAMA; muestra el componente `GeneracionProgresOverlay` en su lugar.
- El overlay muestra: nombre del programa, barra de progreso (bloquesListos / bloquesTotal), nombre del bloque siendo procesado actualmente, y estado descriptivo ("Generando guiones...", "Generando audio...", "En cola...").
- Mientras `programa.estado === 'GENERANDO'`, el intervalo de polling de `fetchEstado` baja de 10 s a 3 s.
- Cuando `programa.estado` pasa a `'LISTO'`, el overlay desaparece y el controlador transiciona al modo PROGRAMA con fade-in normal.
- Si `programa.estado === 'ERROR'`, el overlay muestra un mensaje de error descriptivo sin bloquear el resto de la UI.

### Página de Aire — regeneración de noticias al terminar el programa
- Cuando `onFinPrograma` dispara la regeneración de noticias, mostrar un indicador no bloqueante (toast o badge) con texto "Actualizando noticias...".
- El indicador desaparece automáticamente al completar (polling confirma bloque NOTICIA en LISTO) o tras 120 s de timeout.

### Editor — generación de programa completo
- El botón "Generar programa" se deshabilita mientras `programa.estado === 'GENERANDO'`.
- Durante la generación, la lista de bloques muestra el estado individual de cada bloque (PENDIENTE, GENERANDO_GUION, GENERANDO_AUDIO, LISTO, ERROR) con el badge existente.
- Se añade una barra de progreso global encima de la lista: X de N bloques completados.
- El poll durante `GENERANDO` es cada 3 s; fuera de ese estado vuelve a ser pasivo (solo al montar la página).
- Al completar (todos los bloques en LISTO o programa en LISTO), se detiene el poll y se actualiza el estado del programa en UI.

### Editor — generación de preview por bloque
- El comportamiento existente (`pollBloquePreviewGeneracion` + `badgeEstado`) no cambia.
- El badge GENERANDO ya muestra el estado correctamente con pulse.

## Notes

- `aire/estado` ya hace `prisma.programa.findFirst` con `include: { bloques }`. Agregar `.generaciones({ orderBy: { createdAt: 'desc' }, take: 1 })` para obtener `generacionActiva.estado`.
- Para `bloqueActualTitulo`: filtrar los bloques con estado `GENERANDO_GUION` o `GENERANDO_AUDIO` y devolver el título del primero.
- El campo `panelToken` de `ProgramaAireEstado` es null cuando `programa.estado !== 'LISTO'` — la condición de entrada a modo PROGRAMA ya lo cubre; no cambiar esa lógica.
- El polling de 3 s en `AireController` debe ser conditional: solo cuando `estado?.ahora?.programa?.estado === 'GENERANDO'`. Fuera de ese estado mantener 10 s para no saturar el servidor.
- Para el editor: el `useEffect` que dispara el poll debe limpiar el intervalo cuando `programa.estado !== 'GENERANDO'`.
- El overlay de generación en aire debe ocupar el mismo espacio que `ModoPrograma` para no romper el layout del `ControlsBar`.

## AC
- [ ] Cuando un programa está en estado GENERANDO en la grilla activa, la página de Aire muestra el overlay de progreso (no "Programa no listo")
- [ ] El overlay refleja el bloque que se está procesando actualmente con su nombre
- [ ] La barra de progreso global del editor avanza bloque a bloque durante la generación
- [ ] El botón "Generar programa" está deshabilitado mientras hay generación en curso
- [ ] Al terminar la generación, la UI transiciona automáticamente al modo PROGRAMA sin recargar la página
- [ ] Cuando termina el programa en Aire y se regeneran noticias, el usuario ve un indicador "Actualizando noticias..."
- [ ] Ningún caso muestra contenido parcial o sin audio — siempre hay un estado de carga visible mientras se genera

## Changelog
- v1 (2026-05-26): spec inicial
