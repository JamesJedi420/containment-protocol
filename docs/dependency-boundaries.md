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

### Affiliation work-queue operational decisions (SPE-3436)

`src/domain/affiliationFileWorkQueueDecisions.ts` resolves the operational queue
entry from canonical person-status snapshots and existing workflow records.
The store uses its entry lookup for the ten existing affiliation commands;
record builders, mutation guards and persistence ownership stay unchanged.
`src/features/operations/affiliationPersonStatusMirrorView.ts` adds display copy,
status labels and queue ordering to those decisions. Neither domain nor store
imports that feature projection. The SPE-3436 contract test covers these recovered
imports; repository-wide boundary enforcement remains SPE-3437.

### Front-desk authored contract (SPE-3435)

`src/domain/frontDeskTriggers.ts` and `frontDeskChoices.ts` own the authored trigger
and consequence definitions. `frontDeskAuthored.ts` selects notice variants, route
IDs, and choices using those definitions and existing domain helpers. Stability
analysis consumes this metadata directly. `src/features/operations/frontDeskView.ts`
owns briefing copy, tones, action links, and hub projections. The feature trigger
and choice modules are compatibility re-exports of the canonical domain definitions.
No domain module calls the feature projection or registers a React component.

The unused `appRoutes` example was removed from `screenRouting.ts`. The incident
mock remains dormant, as documented in `src/features/incidents/README.md`;
`src/app/App.tsx` remains the active React routing owner. Domain routing retains
only deterministic condition evaluation and branch selection.

- Lint rule: Disallow `../<feature>` imports in `src/features/**` except for explicitly allowed shared selectors.
- Test: Add a boundary test to fail if any disallowed import is present.

---

## Projection boundary for high-coupling surfaces (SPE-46)

Knowledge-heavy, exploration-heavy, and hub-facing features must route derived state through **centralized projections / view-model builders** (`src/features/*View.ts`, shared selectors) instead of recomputing ad hoc logic inside routes or leaf components. Hub projections should expose **bounded actionable summaries** — enough to decide — not raw simulation noise that couples unrelated screens.

This document is enforced by lint and test guardrails. See `eslint.config.js` and `test/boundary-enforcement.test.ts`.
