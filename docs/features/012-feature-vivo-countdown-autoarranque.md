# Feature: Countdown de slots y auto-arranque preciso en el vivo
> Status: DONE
> v1 | 2026-05-25

## Why
El operador del vivo no sabe cuánto tiempo queda en el slot actual ni cuándo empieza el siguiente. El auto-arranque del próximo slot puede demorarse hasta 30 segundos porque depende del ciclo de polling. En una radio en vivo ambas cosas son inaceptables.

## Files

### Modify
- `src/components/aire/AireController.tsx` — reducir intervalo de polling a 10s; agregar un `setTimeout` basado en `segundosHastaFin` para disparar el refresco en el momento exacto de cambio de slot; pasar datos de countdown a `ControlsBar`
- `src/components/aire/ControlsBar.tsx` — mostrar tiempo restante del slot actual y nombre + hora del siguiente slot; mostrar bloque en reproducción actual
- `src/components/aire/GrillaHoy.tsx` — destacar el slot "siguiente" con un indicador visual diferente al "activo"
- `src/components/aire/ModoPrograma.tsx` — exponer bloque actual al padre vía callback `onBloqueChange`

## Contracts

```typescript
// Props adicionales en ControlsBar
type ControlsBarProps = {
  modo: ModoAire
  onSiguienteBloque: () => void
  onInsertarPublicidad: () => void
  // nuevas:
  segundosHastaFin: number | null      // tiempo hasta fin del slot actual
  siguienteSlot: SlotHoy | null        // datos del próximo slot
  segundosHastaSiguiente: number | null
  bloqueActual: string | null          // título del bloque en reproducción
}
```

## Behavior

**Countdown en ControlsBar**
- La barra inferior muestra dos contadores:
  - Izquierda: "Slot termina en MM:SS" (cuenta regresiva desde `segundosHastaFin`). Se actualiza cada segundo en el cliente con `setInterval(1000)`, sin hacer fetch.
  - Derecha: "Siguiente: [nombre programa o DJ] a las HH:MM" (muestra `siguienteSlot.horaInicio`).
- Si no hay slot activo, muestra "Siguiente: [nombre] en MM:SS" usando `segundosHastaSiguiente`.
- Si no hay slot siguiente, muestra "Sin programación posterior".

**Bloque actual en ControlsBar**
- Cuando `modo === "PROGRAMA"`, la barra muestra en el centro el título del bloque en reproducción (recibido vía `onBloqueChange` desde `ModoPrograma`).

**Auto-arranque preciso**
- Cuando `fetchEstado` responde con `segundosHastaFin > 0`, el `AireController` registra un `setTimeout(fetchEstado, segundosHastaFin * 1000 + 500)` que dispara el fetch exactamente al cambio de slot (con 500ms de margen).
- El poll de 10s sigue activo como fallback.
- El `setTimeout` se cancela si llega un fetch de poll antes de que dispare.

**GrillaHoy sidebar**
- El slot "siguiente" (el inmediato después del activo) se muestra con un borde ámbar punteado, distinto al rojo del activo.
- Los slots pasados del día se muestran con opacidad reducida.

## Notes

- El countdown de MM:SS en el cliente se calcula localmente a partir del valor `segundosHastaFin` recibido en el último fetch, decrementando cada segundo. No hace un fetch por segundo.
- Si el reloj del cliente difiere del servidor, puede haber ±1s de drift. Es aceptable.
- `onBloqueChange` debe llamarse desde `ModoPrograma` cada vez que `setIndex` cambia el bloque activo.

## AC
- [ ] La `ControlsBar` muestra una cuenta regresiva MM:SS del slot actual que decrementa cada segundo.
- [ ] La `ControlsBar` muestra el nombre del siguiente slot y su hora de inicio.
- [ ] Cuando el slot termina, el auto-arranque del siguiente slot ocurre en menos de 2 segundos.
- [ ] El título del bloque en reproducción aparece en la `ControlsBar` durante `modo === "PROGRAMA"`.
- [ ] En la sidebar `GrillaHoy`, el slot siguiente tiene indicador visual diferente al activo.
- [ ] Al cambiar de slot, el indicador de la sidebar se actualiza correctamente.

## Changelog
- v1 (2026-05-25): spec inicial
