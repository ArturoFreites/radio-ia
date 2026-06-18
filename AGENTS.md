<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Regla de trabajo con Cursor

**Siempre que se planifique o discuta una feature o fix, lo primero es generar el archivo `.md` correspondiente en `docs/features/` o `docs/fixes/` usando las plantillas de abajo. Cursor es quien implementa el código a partir de esos specs. Claude escribe el spec, no el código.**

No hay excepción: si no hay spec, Cursor no toca código.

## Nomenclatura obligatoria de archivos

Los archivos de specs siguen un orden estricto con prefijo numérico de tres dígitos:

```
docs/features/NNN-feature-[nombre-en-kebab-case].md
docs/fixes/NNN-fix-[nombre-en-kebab-case].md
```

Ejemplos correctos:
- `docs/features/006-feature-analiticas-avanzadas.md`
- `docs/fixes/002-fix-audio-no-carga-en-safari.md`

Reglas:
- El número es correlativo global dentro de cada carpeta (features y fixes tienen su propia secuencia)
- Antes de crear un archivo nuevo, revisar el número más alto existente y sumar 1
- Nunca reutilizar un número, aunque se elimine el archivo
- `_template.md` y otros archivos de referencia sin número no son specs y no se numeran

---

# Writing feature and fix specs for Cursor

Specs live in `docs/features/` and `docs/fixes/`. Use the templates below. Cursor implements from these specs — do not write implementation code in the spec.

## Principles

- **No code in specs.** Cursor generates code. You write behavior + contracts.
- **Contracts only.** Include TypeScript types and API shapes when they are new or non-obvious. Skip types Cursor can infer from the schema.
- **File map first.** Cursor needs to know exactly what to touch before reading anything else.
- **Reference, don't repeat.** `.cursor/rules/` already defines conventions (TypeScript strictness, error handling, file structure). Specs must not duplicate them.
- **One sentence of context.** Why this exists. Not how it works.
- **AC is the test.** Each acceptance criterion must be verifiable by running or clicking — not by reading the code.

---

## Versioning

Every spec has a version line and a `## Changelog` section. Bump the version each time the spec is materially updated (not just status changes).

Format: `> v{N} | {YYYY-MM-DD}` — one line, right after Status.

Rules:
- Status changes (TODO → DONE) do NOT bump the version
- Adding/removing a file from the Files section → bump
- Changing a contract or behavior → bump
- Adding a note from real-world debugging → bump

---

## Feature spec template

```md
# Feature: [name]
> Status: TODO
> v1 | YYYY-MM-DD

## Why
[One sentence. The problem being solved.]

## Files

### Create
- `path/to/file.tsx` — [one-line purpose]

### Modify
- `path/to/file.ts` — [what changes, not how]

### Delete
- `path/to/file.tsx` — [why it's gone]

## Contracts

[New TypeScript types, Prisma schema additions, API request/response shapes.
Skip anything Cursor can derive from existing code or the Prisma schema.]

## Behavior

[Bullet list. What the system does, observable from the outside.
No implementation details. No code. No "call X function".]

## Notes

[Non-obvious constraints, edge cases, gotchas the implementer would miss.
If a note is obvious from the code, skip it.]

## AC
- [ ] [Verifiable outcome]
```

---

## Fix spec template

```md
# Fix: [name]
> Status: TODO
> v1 | YYYY-MM-DD

## Bug
[Symptom. How to reproduce in one step if possible.]

## Root cause
`path/to/file.ts:line` — [one sentence: what is wrong]

## Fix
[What must change. Not the code — the intent.]

## Verify
[How to confirm the fix works. Specific action + expected result.]

## Changelog
- v1 (YYYY-MM-DD): [brief description]
```

---

## What to omit

- Code blocks with implementation (Cursor writes code)
- Explanations of existing behavior that isn't changing
- Step-by-step "how to implement" instructions
- Anything already covered by `.cursor/rules/`
- Database migration SQL (Cursor generates it from schema changes)
