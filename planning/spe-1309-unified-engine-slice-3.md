# SPE-1309 — Unified cognitive hazard engine (slice 3)

One-page implementation plan. Linear: child under [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — **unified cognitive hazard engine advanceWeek exposure tick (slice 3)** (create/claim on start). Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) stays **Backlog** — unified engine AC rows 1–3 not fully met until runtime effect slices.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1309 child — unified cognitive hazard engine advanceWeek exposure tick (slice 3)                       |
| **Status** | **Shipped** — PR #2809 @ `0b56a272`                                                                        |
| **Parent** | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — Unified cognitive hazard engine (umbrella)    |
| **Branch** | `spe-1309-unified-engine-slice-3`                                                                          |
| **Base `main` SHA** | `9c8837ac`                                                                                          |

## Goal

Wire persisted `cognitiveHazardExposureRecords` into `advanceWeek` with a pure domain weekly exposure tick: one-step memory-impairment-band transitions from projected exposure review signals while preserving terminal erased posture and sibling trigger-channel compose via slice 1 helpers.

## Prerequisite (on `main` @ `9c8837ac`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Engine anchor        | `src/domain/cognitiveHazardEngine.ts` (SPE-1309 slice 1 / PR #2807)    |
| Persistence          | `cognitiveHazardExposureRecords` on `GameState` (slice 2 / PR #2808)   |
| Sibling weekly hook  | `src/domain/psychologicalResilienceWeeklyOrchestration.ts` (SPE-2435)  |
| Fixtures             | `COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE`, stable/failed countermeasure |

## Orchestration tick contract (slice 3)

- **intact → fragmented** — `exposureReviewBand` is `elevated` or `critical`.
- **fragmented → compromised** — `exposureReviewBand` is `elevated` or `critical` and `aggregateExposurePressure` ≥ 0.55.
- **compromised → erased** — `exposureReviewBand` is `critical` and (`countermeasureFailed` or `aggregateExposurePressure` ≥ 0.75).
- **Terminal** — `erased` records do not advance further; duty/procedure flags preserved.
- **Sibling compose** — `mergePropagationResistanceTriggerChannels` merges `inferTriggerChannelsFromPropagationResistance` output into `activeTriggerChannels` when tags supplied (optional compose step; no SPE-2108 / SPE-2116 hook changes).
- **Validation gate** — invalid post-tick candidates preserve the source record.
- **One composite step per week** — at most one memory-band step per record per tick; re-tick same week is idempotent.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyCognitiveHazardExposureTick` in domain module          | Planning mirror UI                            |
| Call from `advanceWeek` after week increment (`result.week`)       | SPE-2108 / SPE-2116 weekly hook changes       |
| Sibling trigger-channel compose helper (slice 1 attach surface)    | Agent/knowledge/procedure simulation triggers |
| Targeted domain + `advanceWeek` integration tests                    | Full SPE-1309 parent Done                     |
| Slice doc (this file) + backlog handoff                            | Slice 1–2 validation/projection contract edits |

## Acceptance

- [x] Empty `cognitiveHazardExposureRecords` map is a no-op without throw
- [x] Memetic escalation fixture escalates to `compromised` while preserving subject ref
- [x] Failed countermeasure fixture remains idempotent at `erased`
- [x] Stable subject fixture unchanged on low exposure
- [x] Re-tick after advance is idempotent
- [x] `advanceWeek` integration matches direct weekly tick output
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/cognitiveHazardWeeklyOrchestration.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/cognitiveHazardWeeklyOrchestration.test.ts`, `src/test/advanceWeek.cognitiveHazardExposureRecords.integration.test.ts` |
| Plan   | `planning/spe-1309-unified-engine-slice-3.md`, `planning/backlog.md`  |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Sibling registry compose wire-up from SPE-2108 persisted maps | **Shipped slice 4** | Compose helper wired in slice 4 / PR #2810 |
| Agent/knowledge/procedure simulation triggers | SPE-1309 follow-up | Parent AC row 3 runtime effects deferred |
| Planning mirror UI | SPE-1309 follow-up | Mirror follows orchestration pattern |
| Full SPE-1309 parent Done | SPE-1309 | Multiple slices remain |

## Validation

- `npm run lint`
- `npm run test:run src/test/cognitiveHazardWeeklyOrchestration.test.ts src/test/advanceWeek.cognitiveHazardExposureRecords.integration.test.ts src/test/cognitiveHazardEngine.test.ts`

## See also

- `planning/spe-1309-unified-engine-slice-2.md` — persistence slice
- `planning/spe-1615-psychological-resilience-registry-slice-3.md` — sibling weekly-hook pattern
