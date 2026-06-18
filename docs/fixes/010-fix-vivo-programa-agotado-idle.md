# Fix: Programa termina antes del slot y el vivo queda en IDLE permanente
> Status: DONE
> v1 | 2026-05-25

## Bug
Si el audio del programa dura menos que el slot de horario (ej. programa de 45 min en un slot de 60 min), cuando termina el último bloque `onFinPrograma` dispara → `programaAgotado = true` → `desiredModo = IDLE`. El vivo muestra "Sin programación activa" durante los 15 minutos restantes del slot, con silencio en antena.

Reproducir: crear un slot de 60 min, asignar un programa cuyo audio total es ~30 min, abrir el vivo. A los ~30 min el programa termina y el vivo queda en IDLE hasta que el slot termina.

## Root cause

`src/components/aire/AireController.tsx:108` — cuando `programaAgotado === true`, `desiredModo` retorna `"IDLE"` sin verificar si hay un fallback disponible (sesión DJ activa). No hay lógica de "fill" para el tiempo restante del slot.

## Fix

Cuando `onFinPrograma` dispara y el slot actual todavía está activo (`estado.ahora !== null`):
- Si hay una sesión Spotify activa (`spotifyOk === true`) → transicionar a `"DJ"` como fill hasta que el slot termine.
- Si no hay sesión Spotify → reiniciar el programa desde el bloque 0 y repetirlo (loop silencioso: se reproduce nuevamente).
- El loop/fallback DJ se mantiene hasta que el slot cambie (el polling o el setTimeout de fin de slot lo detecta), momento en que `programaAgotado` se resetea normalmente.

El comportamiento de loop puede causar que el mismo programa suene dos veces. Eso es preferible al silencio.

## Notes

- El fallback a DJ solo aplica si la sesión Spotify está en estado ACTIVA y hay una playlist activa. Si Spotify falla, caer al loop del programa.
- No mostrar el aviso "Sin programación activa" durante el fill — la UI debe comportarse como si el slot estuviera activo normalmente.

## Verify

1. Slot de 60 min, programa con audio de ~10 s (para testear rápido).
2. El programa termina → si hay sesión Spotify activa, el vivo cambia a modo DJ sin mensaje de IDLE.
3. Si no hay sesión Spotify, el programa vuelve a reproducirse desde el bloque 0.
4. Cuando el slot de 60 min termina (o al editar la grilla para cambiarlo), el fill se detiene normalmente.

## Changelog
- v1 (2026-05-25): spec inicial
