# SPE-2117 — Recurrent catastrophe amelioration registry weekly recurrence advance hook (slice 3)

One-page implementation plan. Linear: child [SPE-2364](https://linear.app/spectranoir/issue/SPE-2364) under [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) / anchor [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117). Follows shipped slice 2 (`planning/recurrent-catastrophe-amelioration-registry-slice-2.md`, PR #2595).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2364 — Recurrent catastrophe amelioration registry weekly recurrence advance hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2364) |
| **Status** | **Shipped** — PR #2597 @ `2d9c1beb`                                                                        |
| **Parent** | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) — Case / facility lifecycle (stays open)         |
| **Anchor** | [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117) — Recurrent catastrophe amelioration registry    |
| **Branch** | `spe-2117-recurrent-catastrophe-weekly-hook-slice-3`                                                     |
| **Base `main` SHA** | `833c3006`                                                                                          |

## Goal

Wire persisted `recurrentCatastropheRecords` into `advanceWeek` so cadence-due recurrence cycles advance `recurrenceCount` and `lastOccurrenceWeek` deterministically when the simulation week crosses the cadence interval.

## Prerequisite (on `main` @ `833c3006`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/recurrentCatastropheAmeliorationRegistry.ts` (SPE-2117 / PR #2436) |
| Persistence          | `recurrentCatastropheRecords` on `GameState` (SPE-2363 / PR #2595)       |
| Sibling weekly hooks | `extranormalEventWeeklyMonitoring.ts` (SPE-2315), `unexplainedLocationWeeklyLifecycle.ts` (SPE-2317) |

## Orchestration tick contract (slice 3)

- **Due week** = `lastOccurrenceWeek` + cadence interval (`weekly` 1, `monthly` 4, `seasonal` 13, `annual` 52, `irregular` 8).
- When `week >= dueWeek`: increment `recurrenceCount` by 1 and set `lastOccurrenceWeek` to the current simulation week.
- Records without `lastOccurrenceWeek` are unchanged (no implicit seed).
- One recurrence step per record per tick when due; re-applying for the same week is idempotent.
- `projectNextRecurrenceRisk` is projection-only; the tick does not consult it for mutation decisions.
- `validateRecurrentCatastropheRecord` gates any mutated record; invalid candidates return the prior record unchanged.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyRecurrentCatastropheTick` in domain module               | New persistence fields, UI, report notes      |
| `resolveRecurrenceDueWeek` helper for tests and due-week reads       | SPE-1310 parent closure                       |
| Call from `advanceWeek` after week increment (`result.week`)       | SPE-868 post-incident review wire-up          |
| Targeted domain + `advanceWeek` integration tests                    | Slice-1 validation semantic changes           |
| Slice doc (this file) + backlog handoff on ship                      | Sanitize/hydration changes                    |

## Acceptance

- [x] Empty `recurrentCatastropheRecords` map is a no-op without throw
- [x] Records unchanged while `week < recurrenceDueWeek`
- [x] Cadence-due records advance `recurrenceCount` and `lastOccurrenceWeek` when `week >= dueWeek`
- [x] `preventionCeiling: impossible` records do not gain active prevention tactics on tick
- [x] Warnings-only records still tick when cadence due
- [x] `irregular` cadence interval (8 weeks) handled deterministically
- [x] Re-applying tick after advance is idempotent for the same week
- [x] `npm run lint` + targeted tests + persistence regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/recurrentCatastropheWeeklyOrchestration.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/recurrentCatastropheWeeklyOrchestration.test.ts`, `src/test/advanceWeek.recurrentCatastrophe.integration.test.ts` |
| Plan   | `planning/recurrent-catastrophe-amelioration-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-868 post-incident review refs wire-up | SPE-868 follow-up | Out of weekly-hook boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Case lifecycle transitions on recurrence | SPE-1310 | Cadence advance only in slice 3 |

## See also

- `planning/recurrent-catastrophe-amelioration-registry-slice-2.md`
- `planning/unexplained-location-registry-slice-3.md`
- `planning/extranormal-event-registry-slice-3.md`
