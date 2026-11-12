# SPE-2432 — Surveillance tuning registry weekly advanceWeek orchestration hook (slice 3)

One-page implementation plan. Linear: [SPE-2432](https://linear.app/spectranoir/issue/SPE-2432) (child under [SPE-848](https://linear.app/spectranoir/issue/SPE-848)). Follows shipped slice 2 (`planning/spe-848-surveillance-tuning-registry-slice-2.md`, PR #2733 / [SPE-2431](https://linear.app/spectranoir/issue/SPE-2431)).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2432 — Surveillance tuning registry weekly advanceWeek orchestration hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2432) |
| **Parent** | [SPE-848](https://linear.app/spectranoir/issue/SPE-848) — Surveillance and capacity intervention tuning     |
| **Branch** | `spe-848-surveillance-tuning-weekly-hook-slice-3`                                                          |
| **Status** | **Shipped** — PR #2735 @ `9573ec37`                                                                        |
| **Base `main` SHA** | `f272a1ba`                                                                                          |

## Goal

Wire persisted `surveillanceInterventionTuningRecords` into `advanceWeek` with a pure domain weekly tick: intervention-level transitions from surveillance/capacity/collateral signals and horizon outcome refresh under the current intervention frame.

## Prerequisite (on `main` @ `f272a1ba`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Tuning registry      | `src/domain/surveillanceCapacityInterventionTuningRegistry.ts` (SPE-848 slice 1) |
| Persistence          | `surveillanceInterventionTuningRecords` on `GameState` (SPE-2431 / PR #2733) |
| Cross-join compose   | `src/domain/coerciveProtocolIntegratedHealthCrossReconciliation.ts` (SPE-2430) |
| Fixture              | `SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE`                               |

## Orchestration tick contract (slice 3)

- **Escalation** — `relaxed` → `sustained` when surveillance ≥ 0.65 and (monitoring exceeds contact or healthcare load ≥ 0.4); `alternative_support` → `sustained` when surveillance ≥ 0.75 with monitoring/contact mismatch; `sustained` → `escalated` when surveillance ≥ 0.8, monitoring exceeds contact, and healthcare load ≥ 0.5.
- **Collateral relaxation** — `sustained`/`escalated` → `alternative_support` when collateral strain ≥ 0.55 and surveillance < 0.5; or when sustained-under-collateral-strain projection holds and healthcare load < 0.5 (capacity allows de-escalation despite surveillance).
- **De-escalation step** — `escalated` → `sustained` when collateral ≥ 0.55 and surveillance < 0.6.
- **Horizon refresh** — recompute short/medium/long `horizonOutcomes` from projection + intervention frame each tick; idempotent when level and horizons already match.
- **Validation gate** — invalid post-tick candidates preserve the source record.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklySurveillanceInterventionTuningTick` in domain module   | Planning mirror UI                            |
| Call from `advanceWeek` after week increment (`result.week`)         | SPE-1615 psychological resilience cross-join  |
| Targeted domain + `advanceWeek` integration tests                  | Surveillance-tuning mirror/report surfacing   |
| Slice doc (this file) + backlog handoff                            | Full SPE-848 parent Done                      |

## Acceptance

- [x] Empty `surveillanceInterventionTuningRecords` map is a no-op without throw
- [x] Relaxed records escalate to `sustained` when surveillance and healthcare load rise together
- [x] Subject-22 fixture relaxes to `alternative_support` under collateral strain with capacity headroom
- [x] Horizon outcomes refresh under one intervention frame
- [x] Re-tick after advance is idempotent
- [x] `advanceWeek` integration matches direct weekly tick output
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/surveillanceInterventionTuningWeeklyOrchestration.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/surveillanceInterventionTuningWeeklyOrchestration.test.ts`, `src/test/advanceWeek.surveillanceInterventionTuningRecords.integration.test.ts` |
| Plan   | `planning/spe-848-surveillance-tuning-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Suggested owner | Why deferred |
| ---- | --------------- | ------------ |
| Planning mirror UI over tuning records | SPE-848 slice 4+ | Orchestration must land before mirror projections |
| SPE-1615 psychological resilience cross-join | SPE-1615 | No runtime registry anchor yet |
| Surveillance-tuning surfacing in mirror / weekly notes | SPE-2430 follow-up | Out of orchestration-only boundary |
| Full SPE-848 parent Done | SPE-848 | Mirror + broader AC may remain |

## See also

- `planning/spe-848-surveillance-tuning-registry-slice-2.md` — persistence slice
- `planning/contained-person-therapeutic-care-registry-slice-3.md` — sibling weekly-hook pattern
- `planning/rule-document-compliance-containment-registry-slice-3.md` — projection-driven transition pattern
