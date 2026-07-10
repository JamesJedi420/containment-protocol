# Architecture and simulation layers

Per `docs/dependency-boundaries.md` and `src/test/boundary-enforcement.test.ts`.

## Layer rules

| Path | Rule |
| --- | --- |
| `src/domain/**` | Pure simulation. **MUST NOT** import `src/app/`, `src/features/`, or React. |
| `src/app/store/**` | Orchestration only. May import domain; **MUST NOT** import feature UI. |
| `src/features/**/*View.ts` | Pure projections/selectors. **MUST NOT** import UI or cross-feature projections. |
| `src/features/**/*.tsx` | Presentational UI. Use `*View.ts` projections; **MUST NOT** embed simulation math. |

## Determinism and week-close

- Outcomes **MUST** be reproducible (seeded RNG). Flag `Math.random()`, `Date.now()` in domain logic, and silent state mutation.
- Week-close hooks **MUST** run at week-close (`advanceWeek`), not mid-week. Flag operating cost, procurement, registry, and funding mutations at wrong phase as **P0**.

## Persistence and events

- New persisted fields **MUST** have `normalize*` defaults on hydrate.
- Event schema changes **MUST** follow `SCHEMA_REGISTRY.md` and `src/domain/events/eventValidation.ts`.

## Vite 8

In dev-server-loaded files, type-only imports **MUST** use `import type { ... }`.
