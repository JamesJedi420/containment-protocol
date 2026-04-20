# Dependency Boundaries: Containment Protocol

## Layer Definitions

- **Domain** (`src/domain/**`): Core simulation logic, rules, math, state transitions, persistence. No imports from orchestration, projections, or UI.
- **Orchestration/Store** (`src/app/store/**`): State management, selectors, and orchestration. May import from domain, but not from projections or UI.
- **Projection/View-Model** (`src/features/*View.ts`, `src/features/*Selectors.ts`): Pure selectors and view-models. May import from domain and store, but not from UI components or other features' projections.
- **UI/Components** (`src/features/**`, `src/styles/**`): Presentational React components, layout, Tailwind, static content. Prefer projection/selectors. A narrow exception is allowed for canonical domain summary/formatter helpers when they are the single owner of explanatory output and prevent duplicate truth in UI.

## Allowed Dependency Directions

- Domain → (none)
- Store/Orchestration → Domain
- Projection/View-Model → Domain, Store
- UI/Components → Projection/View-Model
- UI/Components → Stable canonical domain summarizers/formatters for deterministic surfacing only
  - Examples: report note formatting, typed outcome/consequence summaries, distortion summaries, cadence/threshold summaries
  - Non-examples: simulation mutators, raw resolution math, direct state transition helpers

## Disallowed

- Feature-to-feature direct imports (e.g., `src/features/teams` importing from `src/features/cases`)
- UI importing from broad domain internals when a projection or canonical summary helper is not the intent
- Projections importing from other projections
- UI re-deriving distortion summaries, consequence ladders, countermeasure/resistance explanations, or outcome-band text from raw state when a canonical helper already exists

## Interface Extraction Guidance

- If multiple features need shared logic, extract to a projection or selector in a stable shared location (e.g., `src/features/sharedView.ts` or `src/app/store/selectors/`).
- If the shared logic is itself canonical simulation interpretation, keep it in domain and expose a narrow deterministic helper rather than duplicating the interpretation in multiple UI surfaces.
- Do not move large blocks of code; prefer narrow, stable interfaces.

## Guardrails

- Lint rule: Disallow `../<feature>` imports in `src/features/**` except for explicitly allowed shared selectors.
- Test: Add a boundary test to fail if any disallowed import is present.

---

This document is enforced by lint and test guardrails. See `eslint.config.js` and `test/boundary-enforcement.test.ts`.
