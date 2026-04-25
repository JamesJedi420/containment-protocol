# Containment Protocol

## Project Scope

**Containment Protocol** is a deterministic, domain-driven simulation and management game prototype. It models containment-response operations, squad assignment, weekly incident resolution, and cross-scale state handoff, with a focus on canonical rules, authorable content, and strict architectural boundaries.

## Core Simulation Engine

- Canonical, deterministic simulation logic lives in `src/domain/`
- Simulation output is reproducible through seeded RNG and regression/snapshot tests
- Domain rules, orchestration, projections, and UI remain explicitly separated
- Cross-scale state transfer uses explicit contracts instead of hidden coupling

## Architecture & Boundaries

- **Domain Layer**: pure simulation logic in `src/domain/**`
- **Store / Orchestration**: state management, hydration, transfer, and selectors in `src/app/store/**`
- **Projection / View-Model**: pure selectors and view-models in `src/features/*View.ts`
- **UI / Components**: presentational React modules in `src/features/**` and `src/styles/**`
- Shared explanatory output is owned by canonical domain helpers wherever possible
- Dependency boundaries are enforced by lint/test guardrails; see `docs/dependency-boundaries.md`

## UI / UX Features

- Weekly simulation flow and case resolution
- Dashboard, reports, case management, team and agent detail
- Equipment, fabrication, market, recruitment, factions, intel, training, and operations surfaces
- Feature modules are isolated under `src/features/`

## Authoring & Content

- Case template authoring lives in `src/domain/templates/`
- Narrative and explanatory copy stubs live in `src/data/copy.ts`
- Authoring guardrails and contract tests enforce content integrity
- Starter state is assembled from canonical template modules, not ad hoc UI data

## Event Schema & Versioning

- Operation event schemas, validation, and migration utilities live in `src/domain/events/`
- Schema ownership and migration guidance are documented in `SCHEMA_REGISTRY.md`
- Backward compatibility is maintained through canonical migration paths

## Validation & Testing

- Comprehensive simulation, determinism, regression, UI, and boundary-enforcement coverage
- Domain and feature tests live in `src/test/` and `src/features/**/*.test.tsx`
- Full repository validation is green
- Canonical hidden-state and disguise-validation slices are covered by targeted tests

## Archived Prototype

Early prototype work is preserved in `docs/archived/incident-shell/` and is not part of the active runtime.

## Recent Updates

### Hidden-state, displacement, and counter-detection layer completed ([SPE-70](Issue:15794d65-0b21-4027-a731-195311fbef60))

- Mission results now carry canonical hidden-state fields:
  - `hiddenState`
  - `detectionConfidence`
  - `counterDetection`
  - `displacementTarget`
- Existing report detail surfaces render these fields directly
- Deterministic regression coverage now verifies:
  - distinct hidden-state modalities
  - counter-detection behavior
  - downstream route impact from displacement
  - player-facing ambiguous / partial reveal output

### Behavior-weighted disguise validation completed as a bounded pass ([SPE-285](Issue:8b614f9d-f6f2-40dc-8e33-236639ee52d1))

- Added a shared deterministic behavior-weighted disguise evaluator
- Reused the existing hidden-state pipeline rather than introducing a parallel disguise framework
- Preview and live resolution both route through existing `scoreAdjustment` and `scoreAdjustmentReason` paths
- Strong behavioral mismatch can:
  - raise `detectionConfidence`
  - trigger `counterDetection`
  - downgrade an otherwise clean success to partial under scrutiny
- Reporting continues to use existing mission-result fields and `explanationNotes`
- This pass is intentionally bounded to cases already entering with `hiddenState: 'hidden'`

### Shared rules substrate completed and consumer-migrated ([SPE-41](Issue:2ff4dd31-c2da-4f2d-af8a-8972ff3e2c3c))

- Canonical shared rules now live in:
  - `src/domain/shared/tags.ts`
  - `src/domain/shared/outcomes.ts`
  - `src/domain/shared/modifiers.ts`
  - `src/domain/shared/distortion.ts`
- Distortion handling, typed consequence routing, and shared outcome formatting now flow through canonical helpers
- Dashboard, agency, containment, and shared copy surfaces now consume canonical domain outputs rather than local reinterpretation

### Cross-scale integration and explicit handoff contracts completed ([SPE-64](Issue:08947c41-d5f7-4942-93db-03e0d4476780))

- Explicit `CampaignToIncidentPacket` and `IncidentToCampaignPacket` contracts now carry bounded state between campaign and incident paths
- Weekly resolution uses explicit handoff packets instead of hidden mutable coupling
- Optional modular hook points can inspect or alter handoff packets without rewriting the core loop
- Deterministic contract tests cover packet transfer and integration behavior

### Escalation, threat drift, and time pressure canonicalized ([SPE-20](Issue:95cbf900-c778-4bbd-b803-3b24611f7487))

- Escalation, drift, and time pressure live in canonical simulation state
- Weekly outcome assignment is routed through a canonical registrar with exclusive bucketing
- Per-tick case bucketing no longer allows double assignment across resolved / failed / partial / unresolved paths
- Deterministic scheduler and escalation coverage is green

### Support bottleneck pass completed ([SPE-94](Issue:0291ac24-2790-484f-8551-85794766ca65))

- Equipment recovery throughput is gated by bounded maintenance specialist availability
- Missing or overcommitted support specialists create visible operational bottlenecks
- Existing reports and summaries surface dependency and blockage cleanly
- See `docs/maintenance-specialist-bottleneck.md`

### Repo-wide stabilization completed

- Full TypeScript build is green
- Full Vitest suite is green
- Compatibility drift across older runtime/test surfaces was resolved without undoing current canonical behavior
- Hidden-state and disguise-validation bounded slices remain green after stabilization

## Stack

- React 19
- TypeScript
- Vite 8
- ESLint 9
- Vitest
- Testing Library

## Scripts

- `npm run dev` — start the local Vite dev server
- `npm run build` — run TypeScript build mode and produce a production bundle
- `npm run lint` — run ESLint across the repo
- `npm run format` — rewrite files with Prettier
- `npm run format:check` — verify formatting without changing files
- `npm run test -- --run` — execute the Vitest suite once
- `npm run test:run` — execute the test suite in the repo’s standard non-watch mode
- `npm run test:ui` — open the Vitest UI
- `npm run coverage` — run tests with coverage output

## Structure

- `src/main.tsx` mounts the live gameplay app
- `src/app/App.tsx` defines gameplay routes
- `src/app/store/gameStore.ts` holds simulation state and gameplay actions
- `src/app/store/runTransfer.ts` handles run hydration / transfer compatibility
- `src/domain/models.ts` defines core simulation types and handoff contracts
- `src/domain/sim/*` contains assignment, resolution, spawning, escalation, and week-advance logic
- `src/domain/templates/*` contains starter content, roster/team setup, template sources, and seeded opening cases
- `src/data/startingState.ts` assembles initial state from canonical templates
- `src/features/*` contains gameplay surfaces and projections
- `src/test/*` contains deterministic simulation and regression coverage
- `docs/archived/incident-shell/*` contains the preserved archived prototype

## Cross-Scale Integration & Modular Contracts

### Explicit handoff contracts ([SPE-64](Issue:08947c41-d5f7-4942-93db-03e0d4476780))

- `CampaignToIncidentPacket` and `IncidentToCampaignPacket` define deterministic cross-scale transfer
- `src/domain/sim/advanceWeek.ts` uses these contracts in the canonical weekly loop
- Optional modules can attach through explicit integration points rather than hidden feature coupling
- See:
  - `src/test/crossScaleContracts.test.ts`
  - `src/test/campaignToIncidentHook.integration.test.ts`
  - `docs/cross-scale-integration.md`

## Current Design Notes

- Hidden/disguised activation beyond already-hidden cases remains a follow-up surface
- Shared explanatory ownership stays in the domain wherever possible
- The project prefers compact reusable rules vocabularies over bespoke subsystem logic
- Optional modules should integrate through explicit contracts, not shared mutable state

## Next Useful Steps

- add an authored/runtime activation path for hidden or disguised cases beyond manual hidden-state entry
- expand follow-on infiltration/access issues that consume the new hidden-state and behavior-validation surfaces
- extend route-level drill-down and multi-week navigation coverage
- continue keeping archived prototype code out of active runtime paths unless intentionally revived
