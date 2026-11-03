# SPE-2435 — Psychological resilience registry weekly advanceWeek depletion orchestration hook (slice 3)

One-page implementation plan. Linear: [SPE-2435](https://linear.app/spectranoir/issue/SPE-2435) (child under [SPE-1615](https://linear.app/spectranoir/issue/SPE-1615)). Follows shipped slice 2 (`planning/spe-1615-psychological-resilience-registry-slice-2.md`, PR #2739 / [SPE-2434](https://linear.app/spectranoir/issue/SPE-2434)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2435 — Psychological resilience registry weekly advanceWeek depletion orchestration hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2435) |
| **Parent** | [SPE-1615](https://linear.app/spectranoir/issue/SPE-1615) — Psychological resilience depletion             |
| **Branch** | `jamesdyedbq/spe-1615-psychological-resilience-registry-slice-3`                                           |
| **Status** | **Shipped** — PR #2741 @ `34e7ff4e`                                                                        |
| **Base `main` SHA** | `2b76942f`                                                                                          |

## Goal

Wire persisted `psychologicalResilienceRecords` into `advanceWeek` with a pure domain weekly depletion tick: one-step band transitions from projected exposure score/event count while preserving treatment/rest flags unless an explicit breakdown transition applies.

## Prerequisite (on `main` @ `2b76942f`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Resilience registry  | `src/domain/psychologicalResilienceRegistry.ts` (SPE-1615 slice 1)     |
| Persistence          | `psychologicalResilienceRecords` on `GameState` (SPE-2434 / PR #2739) |
| Sibling weekly hook  | `src/domain/surveillanceInterventionTuningWeeklyOrchestration.ts` (SPE-2432) |
| Fixture              | `PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE`                    |

## Orchestration tick contract (slice 3)

- **stable → strained** — `exposureElevated` (score ≥ 0.6) or `exposureEventCount` ≥ 3.
- **strained → depleted** — `exposureScore` ≥ 0.55 and `exposureEventCount` ≥ 4.
- **depleted → compromised** — `exposureScore` ≥ 0.65, `exposureEventCount` ≥ 5, and active complications.
- **compromised → breakdown** — `exposureScore` ≥ 0.8 and `exposureEventCount` ≥ 7; explicit breakdown gate sets `treatmentRequired: true`, `restRecoverable: false`, `recoveryChannel: treatment_required`.
- **Terminal** — `breakdown` records do not advance further; treatment/rest flags preserved.
- **Validation gate** — invalid post-tick candidates preserve the source record.
- **One composite step per week** — at most one band step per record per tick; re-tick same week is idempotent.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyPsychologicalResilienceDepletionTick` in domain module | SPE-1908 compose wire-up                      |
| Call from `advanceWeek` after week increment (`result.week`)       | Planning mirror UI                            |
| Targeted domain + `advanceWeek` integration tests                  | SPE-130 fatigue-channel conflation            |
| Slice doc (this file) + backlog handoff                            | Full SPE-1615 parent Done                     |

## Acceptance

- [x] Empty `psychologicalResilienceRecords` map is a no-op without throw
- [x] Staged depletion fixture escalates to `compromised` while preserving treatment/rest flags
- [x] Treatment breakdown fixture remains idempotent at `breakdown`
- [x] Stable operator fixture unchanged on low exposure
- [x] Re-tick after advance is idempotent
- [x] `advanceWeek` integration matches direct weekly tick output
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/psychologicalResilienceWeeklyOrchestration.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/psychologicalResilienceWeeklyOrchestration.test.ts`, `src/test/advanceWeek.psychologicalResilienceRecords.integration.test.ts` |
| Plan   | `planning/spe-1615-psychological-resilience-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Suggested owner | Why deferred |
| ---- | --------------- | ------------ |
| SPE-1908 cross-join compose wiring | SPE-1615 slice 4+ | Orchestration must land before compose cross-join |
| Planning mirror UI over resilience records | SPE-1615 slice 4+ | Mirror follows orchestration pattern |
| Full SPE-1615 parent Done | SPE-1615 | Mirror + cross-join slices may remain |

## See also

- `planning/spe-1615-psychological-resilience-registry-slice-2.md` — persistence slice
- `planning/spe-848-surveillance-tuning-registry-slice-3.md` — sibling weekly-hook pattern
