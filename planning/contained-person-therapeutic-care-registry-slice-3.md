# SPE-2115 — Contained-person therapeutic care registry weekly orchestration hook (slice 3)

One-page implementation plan. Linear: [SPE-2343](https://linear.app/spectranoir/issue/SPE-2343) (child under [SPE-2115](https://linear.app/spectranoir/issue/SPE-2115)). Follows shipped slice 2 (`planning/contained-person-therapeutic-care-registry-slice-2.md`, PR #2551).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2343 — Contained-person therapeutic care registry weekly orchestration hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2343) |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-2115](https://linear.app/spectranoir/issue/SPE-2115) — registry anchor (slice 1–2 shipped); umbrella [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889) stays open |
| **Branch** | `spe-2115-contained-person-therapeutic-care-weekly-hook-slice-3`                                           |
| **Base `main` SHA** | `e0d4d6bb`                                                                                          |

## Goal

Wire persisted `containedPersonTherapeuticCareRecords` into `advanceWeek` with a pure domain tick: cadence-based missed-session streak increment and channel degradation rules.

## Prerequisite (on `main` @ `e0d4d6bb`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/containedPersonTherapeuticCareRegistry.ts` (SPE-2115 / PR #2434) |
| Persistence          | `containedPersonTherapeuticCareRecords` on `GameState` (SPE-2342 / PR #2551) |
| Sibling weekly hooks | `src/domain/entityWelfareReclassificationWeeklyOrchestration.ts` (SPE-2340), `src/domain/visualTriggerHazardWeeklyOrchestration.ts` (SPE-2337) |

## Orchestration tick contract (slice 3)

- **Cadence due week** — `weekly`: every simulation week; `biweekly`: even weeks only (`week % 2 === 0`).
- **Missed-session increment** — on a due week, increment `missedSessionStreak` by one when streak is `0` (first miss) or equals the count of due weeks through the prior due week (synced cadence guard); re-tick same week is idempotent.
- **Channel degradation** — after streak update, `active` → `degraded` when streak ≥ 2; `degraded` → `suspended` when streak ≥ 4; `suspended` is terminal (no increment or degradation).
- **One composite step per week** — at most one bounded mutation pass per record per tick; re-tick same week is idempotent.
- **No-op** — empty map, non-due cadence weeks, suspended channels, synced streak/channel posture, or invalid post-tick candidate (validation failure preserves source record).

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyTherapeuticCareTick` in domain module                  | New persistence fields, UI                    |
| Call from `advanceWeek` after week increment (`result.week`)       | SPE-1889 integrated health bundle wire-up     |
| Targeted domain + `advanceWeek` integration tests                  | Sanitize/hydration changes (slice 2)          |
| Slice doc (this file) + backlog handoff                            | Registry schema/validation changes (slice 1)  |

## Acceptance

- [x] Empty `containedPersonTherapeuticCareRecords` map is a no-op without throw
- [x] Weekly cadence increments streak on every due week; biweekly only on even weeks
- [x] Channel degrades active → degraded → suspended at streak thresholds
- [x] Re-applying tick after advance is idempotent for the same week
- [x] Invalid post-tick record must not mutate source record
- [x] Suspended records and non-due weeks byte-stable (containmentDependency preserved)
- [x] Warning-only validation records survive tick
- [x] `npm run lint` + targeted tests + slice 1/2 regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/containedPersonTherapeuticCareWeeklyOrchestration.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/containedPersonTherapeuticCareWeeklyOrchestration.test.ts`, `src/test/advanceWeek.containedPersonTherapeuticCare.integration.test.ts` |
| Plan   | `planning/contained-person-therapeutic-care-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Mirror UI | SPE-1889 follow-up | Out of weekly-hook boundary |
| SPE-1889 integrated health bundle wire-up | SPE-1889 | Parent umbrella; out of weekly-hook boundary |
| SPE-1046 affiliation wire-up | SPE-1046 | Detainee / patient status classes |
| SPE-1889 parent Done | SPE-1889 | Slice 3 is registry orchestration only |

## See also

- `planning/contained-person-therapeutic-care-registry-slice-2.md`
- `planning/entity-welfare-reclassification-registry-slice-3.md`
- `planning/visual-trigger-hazard-registry-slice-3.md`
