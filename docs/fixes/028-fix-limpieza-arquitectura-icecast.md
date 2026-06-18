# Fix: Limpieza de arquitectura — eliminar Icecast, librespot y /escuchar
> Status: DONE
> v1 | 2026-06-01

## Bug
El stack actual incluye servicios y código (Icecast, librespot, worker-stream) que implementan una arquitectura de streaming server-side reemplazada. El modelo real es: `/aire` → OBS → YouTube/Twitch/etc. OBS captura el browser (visual + audio) y es el único "oyente". No hay streaming propio.

## Root cause
Los specs de vivo Icecast y vivo server-side (worker + librespot + FFmpeg → Icecast) fueron implementados y luego el modelo cambió. El código resultante introduce dependencias innecesarias y confunde al leer el proyecto.

## Fix

### docker-compose.yml
- Eliminar el servicio `icecast` completo (imagen, puertos, volúmenes)
- Eliminar el servicio `librespot` completo (imagen, variables de entorno)
- El compose final tiene exactamente 4 servicios: `app`, `worker`, `db`, `redis`

### Archivos a eliminar
- `Dockerfile.librespot`
- `scripts/worker-stream.ts`
- `src/app/escuchar/` — directorio completo (página pública de oyentes, ya no aplica)
- `src/lib/icecast/` — directorio completo (`online.ts` y cualquier otro)
- `icecast.xml` si existe en la raíz del proyecto

### Rutas API a eliminar
- Cualquier endpoint en `src/app/api/` que interactúe con Icecast o librespot (buscar referencias a `icecast`, `librespot`, `SOURCE_PASSWORD`)

### Variables de entorno
- Eliminar de `docker-compose.yml` y `.env.example` las variables: `ICECAST_SOURCE_PASSWORD`, `ICECAST_ADMIN_PASSWORD`, `LIBRESPOT_*`, y cualquier otra exclusiva de esos servicios

### Specs a marcar OBSOLETE
Añadir `> Status: OBSOLETE` en el encabezado de los specs correspondientes al vivo Icecast, sincronización broadcast multi-browser y vivo server-side (librespot+FFmpeg). El motivo: modelo reemplazado por `/aire` → OBS.

## Verify
1. `docker-compose up` levanta exactamente 4 servicios: `app`, `worker`, `db`, `redis`. No hay más.
2. `grep -r "icecast\|librespot" src/` no devuelve resultados.
3. `GET /escuchar` devuelve 404.
4. `GET /aire` sigue cargando correctamente.
5. El worker arranca sin errores de conexión a servicios eliminados.

## Changelog
- v1 (2026-06-01): decisión arquitectural — `/aire` → OBS reemplaza el pipeline Icecast/librespot
