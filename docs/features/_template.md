# Feature: [name]
> Status: TODO
> v1 | YYYY-MM-DD

## Why
[One sentence. The problem being solved, not the solution.]

## Files

### Create
- `src/path/to/file.tsx` — [one-line purpose]

### Modify
- `src/path/to/file.ts` — [what changes]

### Delete
- `src/path/to/old.tsx` — [why]

## Contracts

<!--
Include ONLY:
- New TypeScript types that Cursor must respect as a contract
- New Prisma model fields / new models
- API request/response shapes for NEW endpoints

Skip types Cursor can infer, and skip existing API shapes that aren't changing.
-->

```typescript
// New type or API shape here
```

## Behavior

<!--
Bullet list of observable behaviors.
What happens when the user does X?
What does the system return when Y?
No implementation details, no function names, no "call X".
-->

- [Behavior 1]
- [Behavior 2]

## Notes

<!--
Non-obvious constraints only.
If the implementer would figure it out by reading the code, skip it.
-->

## AC
- [ ] [Specific verifiable outcome — action + expected result]
- [ ] [Another AC]

## Changelog
- v1 (YYYY-MM-DD): Initial spec
