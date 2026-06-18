# Fix: Autoplay de audio bloqueado sin recovery en el vivo
> Status: DONE
> v1 | 2026-05-25

## Bug
Chrome bloquea el autoplay de audio si la página se abre sin interacción previa del usuario (ej. tab nuevo, recarga). `ModoPrograma` hace `a.play()` directamente y el único feedback al operador es el texto flotante "No se pudo reproducir." — sin botón, sin instrucción. El programa no suena y el operador puede no entender por qué.

Reproducir: abrir `/aire?token=...` en un tab nuevo con un slot de PROGRAMA activo → el programa intenta reproducirse automáticamente y Chrome lo bloquea → aparece el aviso de texto pero no hay nada más.

## Root cause

`src/components/aire/ModoPrograma.tsx:150` — `void a.play().catch(() => { onAvisoRef.current("No se pudo reproducir.") })`. El `catch` solo registra texto. No hay estado que distinga "bloqueado por browser" de un error real de red, ni hay mecanismo para reintentar la reproducción con una acción del usuario.

## Fix

- Detectar el error de autoplay (`NotAllowedError`) en el catch de `a.play()`.
- Cuando el error es `NotAllowedError`, guardar el índice pendiente en estado y mostrar un botón de pantalla completa "Tocar para iniciar el audio" sobre el área principal del vivo.
- Al hacer clic en ese botón, reanudar la reproducción desde el índice pendiente. El clic del usuario desbloquea la política de autoplay del browser y `a.play()` funciona.
- Cuando el error NO es `NotAllowedError` (error de red, archivo no encontrado), mantener el comportamiento actual: aviso de texto + saltar al siguiente bloque.
- El botón de "Tocar para iniciar" desaparece una vez que el audio comienza a reproducirse.

## Verify

1. Abrir `/aire?token=...` en Chrome con un slot de PROGRAMA activo.
2. Chrome bloquea el autoplay → debe aparecer un botón visible "Tocar para iniciar el audio" en el centro de la pantalla.
3. Hacer clic en el botón → el programa empieza a reproducirse desde el primer bloque con audio.
4. Refrescar la página con audio ya jugando: el botón no debe aparecer si Chrome ya autorizó la sesión.

## Changelog
- v1 (2026-05-25): spec inicial
