# Containment Protocol — Greptile review rules

Repo config mirrors dashboard Custom Instructions and Custom Context. See also `AGENTS.md` Review guidelines and `.greptile/files.json`.

## Severity

- **P0 / P1:** correctness, determinism, hydration, layer boundaries, week-close order, hidden UI truth, migrations, missing required tests, security.
- **Skip:** style nits, drive-by refactors, scope expansion, pre-existing `npm run build` baseline TS drift unless this PR makes it worse.

## Layers

| Path | Role |
| --- | --- |
| `src/domain/**` | Pure simulation — no store, features, or React |
| `src/app/store/**` | Orchestration — domain only |
| `src/features/*View.ts` | Pure projections — no UI or cross-feature imports |
| `src/features/**/*.tsx` | Presentational UI — use projections |

## Simulation

- Seeded RNG; no `Math.random()` / `Date.now()` in domain logic.
- Week-close mutations belong on week-close (`advanceWeek`), not mid-week.
- New persisted fields need `normalize*` defaults and event schema updates per `SCHEMA_REGISTRY.md`.

## Slice discipline

- One Linear slice per PR; match `planning/spe-*-slice.md` Goal and Acceptance.
- Read PR **Linear** section before commenting.
- Manual re-review: comment `@greptileai` on the PR.

## Vite 8

Use `import type { ... }` for type-only imports in files the dev server loads.
