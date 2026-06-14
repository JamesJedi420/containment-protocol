# SPE-1309 — Unified cognitive hazard engine (slice 6)

One-page implementation plan. Linear: child under [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — **planning mirror UI (slice 6)** (create/claim on start). Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) stays **Backlog** until unified engine AC rows 1–3 are reconciled after mirror ships.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1309 child — planning mirror UI (slice 6)                                                            |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — Unified cognitive hazard engine (umbrella)    |
| **Branch** | `spe-1309-unified-engine-slice-6`                                                                          |
| **Base `main` SHA** | `68f5fc2e`                                                                                          |

## Goal

Read-only planning mirror over persisted `cognitiveHazardExposureRecords` projecting safe labels from `projectCognitiveHazardExposureReview` and slice 5 trigger subject summaries — no re-validation surfacing, no hidden truth, no changes to compose/tick/trigger contracts.

## Prerequisite (on `main` @ `68f5fc2e`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Engine anchor        | `src/domain/cognitiveHazardEngine.ts` (slice 1 / PR #2807)             |
| Persistence          | `cognitiveHazardExposureRecords` on `GameState` (slice 2 / PR #2808) |
| Weekly exposure tick | `applyWeeklyCognitiveHazardExposureTick` (slice 3 / PR #2809)          |
| Sibling compose      | `composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords` (slice 4 / PR #2810) |
| Simulation triggers  | `cognitiveHazardSimulationTriggers.ts` + surfacing (slice 5 / PR #2811) |
| Mirror template      | `selfCensoringInformationMirrorView.ts` (SPE-2330), `publicDisclosureMirrorView.ts` (SPE-2331) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `cognitiveHazardExposureMirrorView.ts` + page + route              | SPE-2108 / SPE-2116 weekly hook changes       |
| UI copy in `src/data/copy.ts`                                      | Slice 1–5 domain compose/tick/trigger edits   |
| Mirror view unit tests + route smoke                               | Agent vitals / scoring side-effects           |
| Slice doc (this file) + backlog handoff                            | Full SPE-1309 parent Done (grooming may follow) |

## Acceptance

- [ ] Empty exposure map renders empty state
- [ ] Fixture rows mirror projection labels deterministically (sorted by record id)
- [ ] Redacted unit scores show `—`; summary shows `[Redacted]` only when summary field is redacted — never raw pre-projection values
- [ ] Trigger chip labels come from `composeCognitiveHazardSimulationTriggerSubjectSummaries` + `formatCognitiveHazardSimulationTriggerSummaryLabels`
- [ ] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Mirror | `src/features/operations/cognitiveHazardExposureMirrorView.ts`, `CognitiveHazardExposureMirrorPage.tsx` |
| App    | `src/app/routes.ts`, `src/app/App.tsx`, `src/data/copy.ts`            |
| Tests  | `src/features/operations/cognitiveHazardExposureMirrorView.test.ts`, `CognitiveHazardExposureMirrorPage.test.tsx` |
| Plan   | `planning/spe-1309-unified-engine-slice-6.md`, `planning/backlog.md`  |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1309 parent acceptance / AC reconciliation | SPE-1309 follow-up | Mirror slice does not alone satisfy parent AC rows 1–3 |
| Agent vitals from simulation triggers | SPE-1309 follow-up | Slice 5 surfaces via report notes only |

## Validation

- `npm run lint`
- `npm run test:run src/features/operations/cognitiveHazardExposureMirrorView.test.ts src/features/operations/CognitiveHazardExposureMirrorPage.test.tsx`

## See also

- `planning/spe-1309-unified-engine-slice-5.md` — simulation triggers (shipped)
- `planning/self-censoring-information-registry-slice-4.md` — mirror UI template (SPE-2330)
