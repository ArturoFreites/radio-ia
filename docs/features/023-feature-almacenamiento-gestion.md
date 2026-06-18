# Feature: Gestión de almacenamiento
> Status: DONE
> v1 | 2026-05-26

## Why
Los archivos de audio generados (previews, programas, Spotify) se acumulan sin visibilidad ni herramienta de limpieza.

## Files

### Create
- `src/app/api/storage/stats/route.ts` — devuelve uso de disco por categoría (tamaño, cantidad de archivos)
- `src/app/api/storage/limpiar/route.ts` — elimina archivos de una o más categorías
- `src/app/(dashboard)/almacenamiento/page.tsx` — página dedicada con desglose y acciones de limpieza
- `src/components/almacenamiento/StorageBreakdown.tsx` — tabla de categorías con botón de eliminar por categoría
- `src/components/almacenamiento/StorageActions.tsx` — botones "Limpiar todo" y "Limpiar selección" con confirmación

### Modify
- `src/app/(dashboard)/dashboard/page.tsx` — añadir stat de almacenamiento con enlace a `/almacenamiento`
- `src/components/dashboard/StatsRow.tsx` — nuevo stat card de uso de disco
- `src/app/(dashboard)/layout.tsx` — añadir enlace "Almacenamiento" en la nav lateral

## Contracts

```ts
// GET /api/storage/stats
type StorageStatsResponse = {
  totalBytes: number;
  categorias: StorageCategoria[];
};

type StorageCategoria = {
  nombre: string;        // "previews" | "spotify" | "programas" | "otros"
  bytes: number;
  archivos: number;
};

// DELETE /api/storage/limpiar
// Body:
type LimpiarRequest = {
  categorias: string[]; // nombres de categoría a borrar; vacío = todas
};
// Response:
type LimpiarResponse = {
  eliminados: number;   // cantidad de archivos borrados
  liberadoBytes: number;
};
```

## Behavior

- `GET /api/storage/stats` recorre `AUDIO_STORAGE_PATH` con `fs.readdir` recursivo y agrupa por subdirectorio de primer nivel (`previews`, `spotify`, el resto va a `programas` u `otros`).
- El stat card en el dashboard muestra el total en MB/GB con un link "Gestionar →" que lleva a `/almacenamiento`.
- La página `/almacenamiento` muestra una tabla con columnas: Categoría, Archivos, Tamaño, Acción.
- Cada fila tiene un botón "Eliminar" que abre un modal de confirmación antes de llamar al endpoint.
- "Limpiar todo" elimina todas las categorías a la vez con confirmación explícita.
- La página hace `revalidatePath` o re-fetch tras cada limpieza y actualiza los totales en pantalla.
- Solo usuarios con sesión válida pueden acceder a estas rutas; las API routes validan sesión y devuelven 401 si no hay.
- Los archivos con `audioUrl` referenciada en la BD (bloque o presentación con estado activo) **no** se borran cuando se limpia la categoría `previews`; sí se borran cuando el bloque fue regenerado o eliminado. Para `programas` y `spotify` se borran siempre que el usuario lo confirme (el usuario es responsable).

## Notes

- Usar `node:fs/promises` con `stat` + `readdir` recursivo para calcular tamaños; no shell commands.
- El modal de confirmación debe mostrar cuánto espacio se va a liberar antes de confirmar.
- `AUDIO_STORAGE_PATH` puede no existir si nunca se generó audio; la API debe devolver `totalBytes: 0` en ese caso sin error.
- Las rutas API sólo son alcanzables desde Server Components o fetch client-side con cookie de sesión; no tienen token público.

## AC
- [ ] El dashboard muestra el espacio total usado en MB/GB con enlace a `/almacenamiento`
- [ ] `/almacenamiento` lista todas las categorías con su tamaño y cantidad de archivos
- [ ] El botón "Eliminar" por categoría pide confirmación con el tamaño a liberar y luego borra los archivos
- [ ] Tras la limpieza, los totales se actualizan sin recargar la página manualmente
- [ ] Si no hay archivos, la página muestra un estado vacío ("Sin archivos generados aún")
- [ ] Un usuario sin sesión recibe 401 al llamar a `/api/storage/stats`

## Changelog
- v1 (2026-05-26): spec inicial
