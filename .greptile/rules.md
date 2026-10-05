# Containment Protocol — Greptile review rules

Repo config mirrors dashboard Custom Instructions and Custom Context. See also `AGENTS.md` Review guidelines and `.greptile/files.json`.

## Severity

- **P0 / P1:** correctness, determinism, hydration, layer boundaries, week-close order, hidden UI truth, migrations, missing required tests, security, or implementation that exceeds an approved boundary.
- **Skip:** style nits, drive-by refactors, scope expansion suggestions, pre-existing `npm run build` baseline TS drift unless this PR makes it worse.

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

## Scope discipline

- Implementation PRs must match an **already-approved** Linear slice/workflow issue and its Goal/Acceptance.
- A workflow/docs-only PR may intentionally have no Linear slice when it creates or expands no feature/backlog scope. Do **not** pressure the author to manufacture an issue for bookkeeping.
- Read the PR **Linear** section and scope boundary before commenting.
- Newly discovered durable feature scope is candidate evidence until Phase 1 → Phase 2 → Phase 3 (including mandatory contradiction review) → Phase 4 authorizes backlog mutation. Do not recommend creating a child/parent/relationship as a review shortcut.
- Manual re-review: comment `@greptileai` on the PR.

## Vite 8

Use `import type { ... }` for type-only imports in files the dev server loads.
