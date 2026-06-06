# SPE-2111 — Visual-trigger hazard registry weekly orchestration hook (slice 3)

One-page implementation plan. Linear: [SPE-2337](https://linear.app/spectranoir/issue/SPE-2337) (child under [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111)). Follows shipped slice 2 (`planning/visual-trigger-hazard-registry-slice-2.md`, PR #2539).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2337 — Visual-trigger hazard registry weekly orchestration hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2337) |
| **Status** | Ready for PR                                                                                               |
| **Parent** | [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111) — registry anchor (slice 1–2 shipped); umbrella [SPE-947](https://linear.app/spectranoir/issue/SPE-947) stays open |
| **Branch** | `spe-2111-visual-trigger-hazard-weekly-hook-slice-3`                                                       |
| **Base `main` SHA** | `bc0629a9`                                                                                          |

## Goal

Wire persisted `visualTriggerHazardRecords` into `advanceWeek` with a pure domain tick: disposal-deadline compliance posture, occlusion-driven pursuit resolution, and scheduled observer-awareness-band transitions when `exposurePathWeeks` is authored.

## Prerequisite (on `main` @ `bc0629a9`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/visualTriggerHazardRegistry.ts` (SPE-2111 / PR #2432) |
| Persistence          | `visualTriggerHazardRecords` on `GameState` (SPE-2336 / PR #2539) |
| Sibling weekly hook  | `src/domain/massAnomalousPopulationEmergenceWeeklyGovernance.ts` (SPE-2333) |

## Orchestration tick contract (slice 3)

- **Disposal compliance posture** — for media instances in the pre-deadline compliance window (`resolveDisposalDeadlineCompliance`), advance `sweepStatus` one step (`none`→`scheduled`, `scheduled`→`in_progress`) when sweep is a required action.
- **Scheduled awareness-band transition** — when `exposurePathWeeks` is authored and `week >= exposurePathWeeks`, escalate `observerAwarenessBand` one ladder step and sync `pursuitState` from `observerAwarenessEscalation` (deterministic; no random rolls).
- **Occlusion pursuit resolution** — sync `pursuitState` from `resolvePursuitStateAfterOcclusion` when covered occlusion resolves active pursuit.
- **One composite step per week** — at most one bounded mutation pass per record per tick; re-tick same week is idempotent.
- **No-op** — empty map, terminal records, post-deadline compliance window, or invalid post-tick candidate (validation failure preserves source record).

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyVisualTriggerHazardTick` in domain module              | New persistence fields, UI                    |
| Call from `advanceWeek` after week increment (`result.week`)       | Propagation graph wire-up (#965 family)       |
| Targeted domain + `advanceWeek` integration tests                  | Pursuit vector simulator integration          |
| Slice doc (this file) + backlog handoff                            | Sanitize/hydration changes (slice 2)          |

## Acceptance

- [x] Empty `visualTriggerHazardRecords` map is a no-op without throw
- [x] Disposal compliance advances `sweepStatus` while inside pre-deadline window
- [x] Covered occlusion resolves `active_pursuit` / `distressed` to `resolved`
- [x] Scheduled awareness-band transition applies when `week >= exposurePathWeeks`
- [x] Re-applying tick after advance is idempotent for the same week
- [x] Invalid post-tick record must not mutate source record
- [x] Unrelated record fields byte-stable when no transition applies
- [x] Warning-only validation records still persist after tick
- [x] `npm run lint` + targeted tests + persistence regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/visualTriggerHazardWeeklyOrchestration.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/visualTriggerHazardWeeklyOrchestration.test.ts`, `src/test/advanceWeek.visualTriggerHazard.integration.test.ts` |
| Plan   | `planning/visual-trigger-hazard-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Propagation graph wire-up | SPE-956 / #965 family | Deferred per slice 1 doc |
| Pursuit vector simulator integration | SPE-947 | Parent umbrella; out of weekly-hook boundary |
| Countermeasure ledger link | SPE-645 | Out of registry mirror boundary |
| Planning mirror UI | SPE-2111 slice 4+ | Out of weekly-hook boundary |
| SPE-947 parent Done | SPE-947 | Slice 3 is registry orchestration only |

## See also

- `planning/visual-trigger-hazard-registry-slice-2.md`
- `planning/mass-anomalous-population-emergence-registry-slice-3.md`
