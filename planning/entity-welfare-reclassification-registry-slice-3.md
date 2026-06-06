# SPE-2114 — Entity welfare reclassification registry weekly orchestration hook (slice 3)

One-page implementation plan. Linear: [SPE-2340](https://linear.app/spectranoir/issue/SPE-2340) (child under [SPE-2114](https://linear.app/spectranoir/issue/SPE-2114)). Follows shipped slice 2 (`planning/entity-welfare-reclassification-registry-slice-2.md`, PR #2545).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2340 — Entity welfare reclassification registry weekly orchestration hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2340) |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-2114](https://linear.app/spectranoir/issue/SPE-2114) — registry anchor (slice 1–2 shipped); umbrella [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) stays open |
| **Branch** | `spe-2114-entity-welfare-reclassification-weekly-hook-slice-3`                                             |
| **Base `main` SHA** | `c41de040`                                                                                          |

## Goal

Wire persisted `entityWelfareReclassificationRecords` into `advanceWeek` with a pure domain tick: scheduled reclassification-state transitions declared in `transitionHistory` apply deterministically when their due week is reached.

## Prerequisite (on `main` @ `c41de040`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/entityWelfareReclassificationRegistry.ts` (SPE-2114 / PR #2433) |
| Persistence          | `entityWelfareReclassificationRecords` on `GameState` (SPE-2339 / PR #2545) |
| Sibling weekly hooks | `src/domain/massAnomalousPopulationEmergenceWeeklyGovernance.ts` (SPE-2333), `src/domain/visualTriggerHazardWeeklyOrchestration.ts` (SPE-2337) |

## Orchestration tick contract (slice 3)

- **Due transition** — earliest `transitionHistory` entry where `week <= simulationWeek`, `fromState === record.reclassificationState`, and `toState !== record.reclassificationState` (pre-scheduled, append-only history from slice 1).
- **Apply** — set `reclassificationState` to entry `toState`; set `reviewGate` and `reviewArtifactRef` from entry when declared, else preserve current.
- **One step per week** — at most one transition per record per tick; re-tick same week is idempotent.
- **Terminal immutability** — `approved`, `denied`, and `reverted` records never mutate.
- **Mistaken records** — skip when last history `toState` does not match current `reclassificationState`.
- **No-op** — empty map, terminal/synced records, pending without eligible scheduled entries, or invalid post-tick candidate (validation failure preserves source record).

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyEntityWelfareReclassificationTick` in domain module  | New persistence fields, UI                    |
| Call from `advanceWeek` after week increment (`result.week`)       | SPE-1046 affiliation wire-up                  |
| Targeted domain + `advanceWeek` integration tests                  | Sanitize/hydration changes (slice 2)          |
| Slice doc (this file) + backlog handoff                            | Registry schema/validation changes (slice 1)  |

## Acceptance

- [x] Empty `entityWelfareReclassificationRecords` map is a no-op without throw
- [x] Scheduled transition unchanged while `week < entry.week`
- [x] When `week >= entry.week`, reclassification state and review refs sync to scheduled entry
- [x] Re-applying tick for same post-advance week is idempotent
- [x] Invalid post-tick record must not mutate source record
- [x] Terminal states and pending records without week gates byte-stable when no transition applies
- [x] Warning-only validation records survive tick
- [x] `npm run lint` + targeted tests + slice 1/2 regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/entityWelfareReclassificationWeeklyOrchestration.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/entityWelfareReclassificationWeeklyOrchestration.test.ts`, `src/test/advanceWeek.entityWelfareReclassification.integration.test.ts` |
| Plan   | `planning/entity-welfare-reclassification-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Mirror UI | SPE-1046 follow-up | Out of weekly-hook boundary |
| SPE-1046 affiliation wire-up | SPE-1046 | Parent umbrella; out of weekly-hook boundary |
| SPE-1888 welfare-debt engine | SPE-1888 | Field hook only in slice 1 |
| SPE-1310 case lifecycle integration | SPE-1310 | Out of registry mirror boundary |
| SPE-1046 parent Done | SPE-1046 | Slice 3 is registry orchestration only |

## See also

- `planning/entity-welfare-reclassification-registry-slice-2.md`
- `planning/public-disclosure-state-registry-slice-3.md`
- `planning/visual-trigger-hazard-registry-slice-3.md`
