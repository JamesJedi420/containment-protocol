# Containment Protocol

## Project Scope

**Containment Protocol** is a deterministic, domain-driven simulation and management game prototype. It models containment-response operations, squad assignment, and weekly incident resolution, with a focus on canonical rules, authorable content, and strict architectural boundaries.

### Core Simulation Engine

- Canonical, deterministic simulation logic in `src/domain/` (rules, math, state transitions, scoring, spawning, pressure, progression, etc.)
- All simulation output is reproducible via seeded RNG and snapshot-based tests
- Strict separation between domain logic, state orchestration, projections, and UI

### Architecture & Boundaries

- **Domain Layer**: Pure simulation logic (`src/domain/**`), no UI or orchestration imports
- **Store/Orchestration**: State management and selectors (`src/app/store/**`)
- **Projection/View-Model**: Pure selectors and view-models (`src/features/*View.ts`)
- **UI/Components**: Presentational React components (`src/features/**`, `src/styles/**`) that prefer projections, but render canonical domain summaries where shared explanatory output is the single source of truth
- Enforced by lint and test guardrails (see `docs/dependency-boundaries.md`)

### UI/UX Features

- Squad assignment, team management, and weekly simulation flow
- Dashboard, case management, team and agent detail, equipment loadouts, fabrication, market, and more
- All major features are in `src/features/` as isolated React modules

### Authoring & Content

- Case template authoring system in `src/domain/templates/` (see `docs/case-template-authoring.md`)
- Narrative content and lore stubs in `src/data/copy.ts`
- Authoring guardrails and contract tests for content integrity

### Event Schema & Versioning

- Operation event schemas with versioning and migration utilities (`SCHEMA_REGISTRY.md`, `src/domain/events/`)
- Backward compatibility and safe migration for all event types

### Validation & Testing

- Comprehensive test suite: simulation, regression, determinism, UI, and boundary enforcement (`src/test/`, `src/features/*/*.test.tsx`)
- Lint and test guardrails for dependency boundaries and authoring contracts

### Archived Prototype

Early UI/logic prototype preserved in `docs/archived/incident-shell/` (not part of active runtime)

---

## Recent Updates (2026-04)

- **Canonical per-tick outcome registrar and exclusive bucketing (SPE-20)**: All case outcome assignment (resolved, failed, partial, unresolved) is now routed through a single canonical registrar in the simulation engine. This guarantees exclusive bucketing per tick and prevents double-bucketing. All surfacing and simulation/scheduler tests now pass with zero failures, and post-tick assertions enforce exclusivity.
- **Shared rules substrate closed and documented (SPE-41)**: Canonical shared rules now live in `src/domain/shared/tags.ts`, `src/domain/shared/outcomes.ts`, `src/domain/shared/modifiers.ts`, and `src/domain/shared/distortion.ts`. Report-note formatting and strategic surfacing are centralized in domain helpers, and dashboard, agency, containment, and shared copy surfaces now render canonical outputs instead of re-deriving local interpretations.
- **Equipment feature fully restored and validated**: All UI and integration tests for the equipment system now pass. The equipment page, loadout controls, and recommendations are fully functional and regression-tested.
- **Maintenance specialist bottleneck for equipment recovery (SPE-94)**: Equipment recovery throughput is now strictly gated by a bounded maintenance specialist pool. Missing or overcommitting this role creates a visible bottleneck, surfaced in player-facing reports. See `docs/maintenance-specialist-bottleneck.md` for details.
- **Canonicalization and bounded niche system**: All niche effects, tags, and specialist unlocks are now defined in canonical modules under `src/domain/`, with strict boundaries enforced between domain logic and UI components.
- **Deterministic simulation and test coverage**: The simulation engine is fully deterministic, with seeded RNG and snapshot-based test validation. All regression, determinism, and scoring tests pass with zero failures.
- **Canonical explanation ownership**: Player-facing report and explanation surfaces now consume canonical domain-produced summaries for outcome bands, consequence routing, distortion states, and bounded pressure summaries instead of keeping parallel UI-side wording logic.
- **Dead code removed**: Legacy and unused code paths have been removed for clarity and maintainability.

All changes are validated by a comprehensive test suite. See the `src/test/` and `src/features/*/*.test.tsx` files for details.

## Stack

- React 19
- TypeScript
- Vite 8
- ESLint 9
- Vitest + Testing Library

## Scripts

- `npm run dev` starts the local Vite dev server
- `npm run build` runs TypeScript build mode and produces a production bundle
- `npm run lint` runs ESLint across the repo
- `npm run format` rewrites files with Prettier
- `npm run format:check` verifies formatting without changing files
- `npm run test -- --run` executes the Vitest suite once
- `npm run test:ui` opens the Vitest UI
- `npm run coverage` runs tests with coverage output

## Structure

- `src/main.tsx` mounts the live gameplay app
- `src/app/App.tsx` defines the gameplay routes for dashboard, cases, teams, and reports
- `src/app/store/gameStore.ts` holds the simulation state and gameplay actions
- `src/domain/models.ts` defines the core simulation types
- `src/domain/sim/*` contains assignment, resolution, spawn, raid, and week-advance logic
- `src/domain/templates/*` contains starter content sources for class tables, roster/team setup, case templates, and seeded opening cases
- `src/data/startingState.ts` assembles the initial game state from the template modules
- `src/data/caseTemplates.ts` re-exports the template catalog for compatibility with existing imports
- `src/app/App.test.tsx` covers the live gameplay routes
- `src/test/sim.*.test.ts` covers simulation regressions and deterministic behavior
- `docs/archived/incident-shell/*` contains the archived incident-shell prototype and its preserved tests

## Cross-Scale Integration & Modular Contracts

### Explicit Handoff Contracts (SPE-64)

- **CampaignToIncidentPacket** and **IncidentToCampaignPacket** provide explicit, deterministic state transfer between campaign and incident/operation logic. See `src/domain/models.ts`.
- The campaign loop in `src/domain/sim/advanceWeek.ts` uses these contracts for all handoff and result flows.
- A modular integration point (`campaignToIncidentHook`) allows optional modules to inspect or modify the handoff packet before incident resolution, supporting extension without core code changes.
- Deterministic contract and integration tests are in `src/test/crossScaleContracts.test.ts` and `src/test/campaignToIncidentHook.integration.test.ts`.
- See `docs/cross-scale-integration.md` for full details and extension guidance.

## Next Useful Steps

- Expand route-level tests around multi-week navigation and report drill-down
- Expand simulation tests around raid staffing limits, unassign flows, and fail escalation variants
- Keep the archived incident-shell prototype out of active runtime and test paths unless it is intentionally revived
