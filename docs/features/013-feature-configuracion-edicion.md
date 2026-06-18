# Feature: Edición de datos de configuración de la radio
> Status: DONE
> v1 | 2026-05-25

## Why
La página `/configuracion` solo muestra datos de la radio de forma estática. El operador no puede editar el nombre de la radio, las fuentes RSS ni el estilo de locución sin acceso directo a la base de datos.

## Files

### Create
- `src/app/api/configuracion/route.ts` — `GET` devuelve config editable de la radio; `PATCH` actualiza campos editables

### Modify
- `src/app/(dashboard)/configuracion/page.tsx` — convertir de Server Component estático a page que pasa datos iniciales a un Client Component
- `src/components/dashboard/ConfiguracionEditor.tsx` — nuevo Client Component con el formulario de edición (**crear**)

## Contracts

```typescript
// PATCH /api/configuracion
type PatchConfigBody = {
  nombre?: string            // nombre de la radio, min 2, max 80
  estiloLocucion?: string    // instrucción de tono/estilo para la IA, max 500
  fuentesNoticias?: string[] // URLs de feeds RSS, max 10 items, cada una max 300 chars
}

type ConfiguracionResponse = {
  nombre: string
  estiloLocucion: string | null
  fuentesNoticias: string[]
  aireToken: string          // readonly, solo lectura
  urlAire: string            // readonly, solo lectura
}
```

## Behavior

- La página muestra tres secciones editables:
  1. **Nombre de la radio** — input de texto, se guarda al hacer clic en "Guardar".
  2. **Estilo de locución** — textarea, instrucción de tono que la IA usa al generar guiones (ej. "Tono cálido y cercano, evitar tecnicismos"). Muestra un placeholder con ejemplo.
  3. **Fuentes de noticias (RSS)** — lista editable de URLs. El operador puede agregar una nueva URL con un input + botón "Agregar", y eliminar una existente con un botón "×" al lado de cada URL.
- Cada sección tiene su propio botón "Guardar" para no obligar a guardar todo junto.
- La sección del URL de aire permanece como solo lectura, con botón "Copiar" al portapapeles.
- Al guardar con éxito, aparece un toast "Guardado".
- Validación cliente y servidor: nombre mínimo 2 caracteres, máximo 10 fuentes RSS.

## Notes

- El `aireToken` no es editable desde aquí. Si se necesita regenerar el token en el futuro, será una feature separada.
- Las `fuentesNoticias` son strings; la validación de que sean URLs válidas es best-effort (verificar que empiecen con `http://` o `https://`).
- El `estiloLocucion` se inyecta en los prompts de Gemini en `src/lib/gemini/prompts/`. La integración con los prompts es fuera del scope de esta feature — aquí solo se persiste el campo.

## AC
- [ ] El operador edita el nombre de la radio, hace clic en "Guardar" y el nombre actualizado aparece en el sidebar.
- [ ] El operador agrega una URL de RSS, guarda, recarga la página y la URL sigue ahí.
- [ ] El operador elimina una URL de RSS y guarda; al recargar ya no aparece.
- [ ] El operador escribe el estilo de locución, guarda y al recargar el texto persiste.
- [ ] El URL de aire tiene botón "Copiar" que copia al portapapeles con toast de confirmación.
- [ ] Intentar guardar un nombre de 1 carácter devuelve error de validación visible.

## Changelog
- v1 (2026-05-25): spec inicial
