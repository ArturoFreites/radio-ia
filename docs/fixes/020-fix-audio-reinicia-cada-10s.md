# Fix: Audio del programa se reinicia cada 10 segundos
> Status: DONE
> v1 | 2026-05-26

## Bug
La transmisión suena con ruido y cortes constantes. El programa de audio se reinicia al bloque 1 cada ~10 segundos en lugar de reproducir en forma continua.

## Root cause
`src/components/aire/ModoPrograma.tsx` — `buildInitialQueue` tiene `bloques` como dependencia de `useCallback`. `bloques` llega como prop desde `AireController` y es un nuevo array en memoria cada vez que `fetchEstado` actualiza `estado` (cada 10 s). Eso provoca que `buildInitialQueue` sea una función nueva cada 10 s, lo que dispara el `useEffect` que hace `prev.pause(); prev.src = ""; playIndex(first)` → reinicio abrupto del audio.

## Fix
En `ModoPrograma`, leer `bloques` desde un `ref` dentro de `buildInitialQueue` en lugar de capturarlo como closure:

- Agregar `const bloquesRef = useRef(bloques)` y un `useEffect` que mantenga `bloquesRef.current = bloques`.
- Cambiar `buildInitialQueue` para que use `bloquesRef.current` internamente, eliminando `bloques` de sus dependencias de `useCallback`.
- Las únicas dependencias del `useCallback` quedan `[programaId, panelToken]`, igual que el `useEffect` de reset.

Con esto, el reset de audio solo ocurre cuando cambia `programaId` o `panelToken` (es decir, cuando cambia el programa), no cuando se recibe una nueva referencia al mismo array de bloques.

## Verify
1. Abrir la página de Aire con un programa activo.
2. Dejar reproducir más de 10 segundos sin tocar nada.
3. Verificar que el audio continúa sin cortes ni ruido.
4. Verificar que al cambiar de programa (slot distinto) el audio sí se reinicia correctamente.

## Changelog
- v1 (2026-05-26): causa raíz identificada, spec creado.
