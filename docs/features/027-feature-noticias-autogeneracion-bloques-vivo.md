# Feature: Auto-generación de bloques NOTICIA al finalizar el programa en vivo
> Status: DONE
> v1 | 2026-05-26

## Why

Un programa de noticias en vivo corre los mismos bloques una y otra vez. Los titulares envejecen. Esta feature auto-regenera los bloques `NOTICIA` desde RSS cada vez que el programa termina un ciclo, para que el siguiente ciclo tenga noticias frescas.

## Files

### Modify
- `src/types/grilla.ts` — agregar campo `tipo` a `BloqueAireEstado`
- `src/app/api/aire/estado/route.ts` — incluir `tipo` en el mapeo de bloques
- `src/components/aire/AireController.tsx` — disparar auto-generación cuando `programaAgotado` se activa y el programa tiene bloques `NOTICIA`
- `src/components/aire/ModoPrograma.tsx` — exponer evento o callback cuando el programa llega al último bloque

### Create
- `src/app/api/aire/noticias/regenerar/route.ts` — endpoint interno que recibe `programaId` y encola regeneración de todos los bloques `NOTICIA` del programa

## Contracts

```ts
// Cambio en BloqueAireEstado
type BloqueAireEstado = {
  id: string;
  titulo: string;
  audioUrl: string | null;
  duracion: number | null;
  tipo: "APERTURA" | "NOTICIA" | "PUBLICIDAD" | "CIERRE" | "CUNA";  // nuevo
};

// POST /api/aire/noticias/regenerar
// Body
type RegenerarNoticiasBody = {
  programaId: string;
};
// Response 202
type RegenerarNoticiasResponse = {
  bloquesEncolados: number; // cantidad de bloques NOTICIA encolados
};
```

## Behavior

- Cuando `onFinPrograma` se dispara (el programa terminó todos sus bloques), `AireController` verifica si `pa.bloques` contiene al menos un bloque con `tipo === "NOTICIA"`.
- Si hay bloques NOTICIA, llama a `POST /api/aire/noticias/regenerar` con el `programaId` y el `aireToken`.
- El endpoint autentica con el `aireToken`, busca todos los bloques `NOTICIA` del programa y encola la regeneración de cada uno de forma idéntica a como lo hace el endpoint `generar-preview` existente.
- El programa no espera la generación antes de terminar: el ciclo actual finaliza y cuando el siguiente ciclo arranque, los bloques nuevos estarán disponibles (o parcialmente listos).
- `AireController` setea `programaAgotado = true` después de disparar la regeneración (mismo comportamiento que hoy).
- Cuando el siguiente slot del mismo programa arranca (próximo ciclo), el endpoint `/api/aire/estado` ya devuelve los bloques actualizados con los nuevos audios.
- Si el programa no tiene bloques `NOTICIA`, no se hace ninguna llamada de regeneración.
- Si la llamada a regenerar falla (red, error de servidor), se ignora silenciosamente — el programa igual termina.

## Notes

- El endpoint regenerar usa el `aireToken` (no `panelToken`) para autenticarse, ya que se llama desde la página de aire.
- No crear nuevos bloques: solo regenerar los existentes con `tipo === "NOTICIA"`. El scraping de la URL original ya guardada en `config.urlNoticia` del bloque es responsabilidad del worker existente.
- Si un bloque NOTICIA no tiene `config.urlNoticia`, omitirlo de la regeneración.
- La regeneración es best-effort: no bloquear la UI ni mostrar error si falla.
- El polling de generación existente en el editor NO aplica aquí — en el vivo no hay UI de progreso por bloque.

## AC
- [ ] Cuando un programa con bloques NOTICIA termina en vivo, se llama automáticamente a la regeneración.
- [ ] El endpoint `/api/aire/noticias/regenerar` retorna 202 con la cantidad de bloques encolados.
- [ ] Los bloques NOTICIA tienen audio nuevo en el siguiente ciclo del programa.
- [ ] Si el programa no tiene bloques NOTICIA, no se hace ninguna llamada de regeneración.
- [ ] Una falla en la regeneración no muestra error ni bloquea el vivo.

## Changelog
- v1 (2026-05-26): spec inicial
