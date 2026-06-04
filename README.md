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
- Dependency boundaries are enforced by Vitest guardrails (`src/test/boundary-enforcement.test.ts`); see `docs/dependency-boundaries.md`

## Shell route disposition

| Route                | Disposition            | Implementation                                                                       |
| -------------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| `/help`              | Bounded guidance index | `HelpPlaceholderPage` — links to Operations Desk, Report, Contracts, Registry, Cases |
| `/containment-site`  | Future placeholder     | `SystemBoundaryPage` — live metrics, no dedicated site UI                            |
| `/rankings`          | Future placeholder     | `SystemBoundaryPage` — report-derived benchmarks only                                |
| `/agency`            | Future placeholder     | `SystemBoundaryPage` — economy/directives stay on Operations Desk until shipped      |
| `/markets-suppliers` | Live                   | `MarketPage`                                                                         |
| `/factions`          | Live                   | `FactionsPage`                                                                       |

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

### Hidden-state, displacement, and counter-detection layer completed ([SPE-70](https://linear.app/spectranoir/issue/SPE-70/hidden-state-displacement-and-counter-detection-layer))

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
- Design reference: `architecture/hidden-state-displacement-counter-detection.md`

### Behavior-weighted disguise validation completed as a bounded pass ([SPE-285](https://linear.app/spectranoir/issue/SPE-285/behavior-weighted-disguise-validation))

- Added a shared deterministic behavior-weighted disguise evaluator
- Reused the existing hidden-state pipeline rather than introducing a parallel disguise framework
- Preview and live resolution both route through existing `scoreAdjustment` and `scoreAdjustmentReason` paths
- Strong behavioral mismatch can:
  - raise `detectionConfidence`
  - trigger `counterDetection`
  - downgrade an otherwise clean success to partial under scrutiny
- Reporting continues to use existing mission-result fields and `explanationNotes`
- This pass is intentionally bounded to cases already entering with `hiddenState: 'hidden'`

### Shared rules substrate completed and consumer-migrated ([SPE-41](https://linear.app/spectranoir/issue/SPE-41/tags-conditions-and-graded-outcome-framework))

- Canonical shared rules now live in:
  - `src/domain/shared/tags.ts`
  - `src/domain/shared/outcomes.ts`
  - `src/domain/shared/modifiers.ts`
  - `src/domain/shared/distortion.ts`
- Distortion handling, typed consequence routing, and shared outcome formatting now flow through canonical helpers
- Dashboard, agency, containment, and shared copy surfaces now consume canonical domain outputs rather than local reinterpretation

### Cross-scale integration and explicit handoff contracts completed ([SPE-64](https://linear.app/spectranoir/issue/SPE-64/cross-scale-integration-and-domain-interface-layer))

- Explicit `CampaignToIncidentPacket` and `IncidentToCampaignPacket` contracts now carry bounded state between campaign and incident paths
- Weekly resolution uses explicit handoff packets instead of hidden mutable coupling
- Optional modular hook points can inspect or alter handoff packets without rewriting the core loop
- Deterministic contract tests cover packet transfer and integration behavior

### Escalation, threat drift, and time pressure canonicalized ([SPE-20](https://linear.app/spectranoir/issue/SPE-20/escalation-threat-drift-and-time-pressure))

- Escalation, drift, and time pressure live in canonical simulation state
- Weekly outcome assignment is routed through a canonical registrar with exclusive bucketing
- Per-tick case bucketing no longer allows double assignment across resolved / failed / partial / unresolved paths
- Deterministic scheduler and escalation coverage is green

### Support bottleneck pass completed ([SPE-94](https://linear.app/spectranoir/issue/SPE-94/support-specialist-multiplier-and-bottleneck-pass))

- Equipment recovery throughput is gated by bounded maintenance specialist availability
- Missing or overcommitted support specialists create visible operational bottlenecks
- Existing reports and summaries surface dependency and blockage cleanly
- See `docs/maintenance-specialist-bottleneck.md`

### Repo-wide stabilization completed

- `npm run test:run` and `npm run lint` are green in CI; treat `npm run build` as a separate type-contract gate (see `AGENTS.md` for known baseline TypeScript drift and Vite 8 type-import caveats)
- Full Vitest suite is green
- Compatibility drift across older runtime/test surfaces was resolved without undoing current canonical behavior
- Hidden-state and disguise-validation bounded slices remain green after stabilization

## Stack

- React 19
- TypeScript
- Vite 8
- ESLint 10
- Vitest
- Testing Library

## Scripts

- `npm run dev` — start the local Vite dev server
- `npm run build` — run TypeScript project build (`tsc -b`) over app + Vite config, then produce a production bundle with Vite (manual chunks in `app.vite.config.ts` are organizational only: `vendor-react`, `vendor-icons`, `vendor-misc`, `content-catalog`, `sim-core`; no bundle-size budgets or analyzer CI gate yet)
- `npm run lint` — run ESLint across the repo
- `npm run format` — rewrite files with Prettier
- `npm run format:check` — verify formatting without changing files
- `npm run test:run` — execute the full Vitest suite once (CI and pre-merge gate; same flags as `npm run test` with `vitest run`)
- `npm run test` — Vitest in watch mode (pass a file path to narrow scope while iterating)
- `npm run test:ui` — open the Vitest UI
- `npm run coverage` — run tests with coverage output
- `npm run verify:audits-index` — assert `docs/design-audits-index.md` matches every top-level `docs/*audit*.md` (excludes the index file itself)
- `npm run verify:theme-contracts` — assert mirrored **SPE-** follow-ups match `architecture/external-design-theme-contracts.md` coverage lines

**Planning and doc curation:** `planning/documentation-curation.md` — when to update backlog, roadmap, mirrors, and the systems map.

**Contributing:** Track work in [Linear](https://linear.app/spectranoir/team/SPE/all) (not GitHub issues). PRs use `.github/pull_request_template.md`; see `docs/contribution-and-release-operations.md` for intake policy, CODEOWNERS placeholders, and Dependabot grouping.

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

### Explicit handoff contracts ([SPE-64](https://linear.app/spectranoir/issue/SPE-64/cross-scale-integration-and-domain-interface-layer))

- `CampaignToIncidentPacket` and `IncidentToCampaignPacket` define deterministic cross-scale transfer
- `src/domain/sim/advanceWeek.ts` uses these contracts in the canonical weekly loop
- Optional modules can attach through explicit integration points rather than hidden feature coupling
- See:
  - `src/test/crossScaleContracts.test.ts`
  - `src/test/campaignToIncidentHook.integration.test.ts`
  - `docs/cross-scale-integration.md`

## Current Design Notes

- **Concealment activation (shipped on `main`):** runtime resolver ([SPE-2107](https://linear.app/spectranoir/issue/SPE-2107), PR #2169), authored triggers ([SPE-2113](https://linear.app/spectranoir/issue/SPE-2113), PR #2175), case-detail prep UI ([SPE-70](https://linear.app/spectranoir/issue/SPE-70), PR #2326), activation events/report notes (PR #2328), and batch-4 concealment trigger migration ([SPE-2249](https://linear.app/spectranoir/issue/SPE-2249), PR #2335).
- **Tiered reveal + hidden-modality matrix (shipped on `main`):** [SPE-781](https://linear.app/spectranoir/issue/SPE-781) reveal slices (PR #2342–#2347); matrix slices [SPE-2281](https://linear.app/spectranoir/issue/SPE-2281)–[SPE-2290](https://linear.app/spectranoir/issue/SPE-2290) (PR #2403–#2423) — domain compose, weekly orchestration, modality report copy, persistent recon cache, false-entity / structural-illusion lifecycle, mode-specific tells, post-matrix signature masking / false-detection / glamour overlay.
- **Intake registry wave (shipped on `main`):** initial registries shipped for [SPE-2105](https://linear.app/spectranoir/issue/SPE-2105) extranormal events, [SPE-2106](https://linear.app/spectranoir/issue/SPE-2106) unexplained locations, and [SPE-2104](https://linear.app/spectranoir/issue/SPE-2104) minor anomaly items (PR #2426–#2428). [SPE-854](https://linear.app/spectranoir/issue/SPE-854) parent integration slices 1–2 are Done; persistence + weekly hooks shipped through [SPE-2315](https://linear.app/spectranoir/issue/SPE-2315) / [SPE-2316](https://linear.app/spectranoir/issue/SPE-2316) / [SPE-2317](https://linear.app/spectranoir/issue/SPE-2317) (PR #2494–#2498).
- **Self-censoring information registry (shipped on `main`):** [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) slice 1 (PR #2429) — see `planning/self-censoring-information-registry-slice-1.md`. [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) parent remains open.
- **Public disclosure state registry (shipped on `main`):** [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) slice 1 (PR #2430) — see `planning/public-disclosure-state-registry-slice-1.md`. [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) parent remains open.
- **Next runtime slice:** see active queue in `planning/backlog.md` (intake registry follow-up after SPE-2317 merge); keep tactical ordering in the backlog instead of duplicating a long queue here.
- Shared explanatory ownership stays in the domain wherever possible
- The project prefers compact reusable rules vocabularies over bespoke subsystem logic
- Optional modules should integrate through explicit contracts, not shared mutable state

## Next useful steps

Canonical near-term queue (merged with roadmap focus): **`planning/backlog.md`**. Deferred deep design without in-repo bodies yet (SPE-186+, knowledge children): **`planning/deferred-design-documents.md`**.

**Recommended next step:** Run `git checkout main && git pull origin main`, then pick from **`planning/backlog.md`**. Historical grooming context is in `planning/scope-discipline-grooming-pass.md`; do not treat it as the current sequencing source.
