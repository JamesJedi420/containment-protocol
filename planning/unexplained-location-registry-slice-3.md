# SPE-2106 — Unexplained location registry weekly lifecycle hook (slice 3)

One-page implementation plan. Linear: child under [SPE-2106](https://linear.app/spectranoir/issue/SPE-2106). Follows shipped slice 2 (`planning/unexplained-location-registry-slice-2.md`, PR #2490).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2317 — Unexplained location registry weekly lifecycle/monitoring cadence advance hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2317) |
| **Status** | **In Progress** — PR pending                                                                               |
| **Parent** | [SPE-2106](https://linear.app/spectranoir/issue/SPE-2106) — registry anchor (slice 1–2 shipped)          |
| **Branch** | `spe-2106-unexplained-location-registry-weekly-lifecycle-slice-3`                                          |
| **Base `main` SHA** | `4045c2b8`                                                                                          |

## Goal

Wire persisted `unexplainedLocationRecords` into `advanceWeek` so monitoring-cadence due weeks advance site lifecycle states deterministically with append-only `statusHistory`.

## Prerequisite (on `main` @ `4045c2b8`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/unexplainedLocationRegistry.ts` (SPE-2106 / PR #2427)        |
| Persistence          | `unexplainedLocationRecords` on `GameState` (SPE-2313 / PR #2490)       |
| Sibling weekly hooks | `extranormalEventWeeklyMonitoring.ts` (SPE-2315), `minorAnomalyItemWeeklyDisposition.ts` (SPE-2316) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyUnexplainedLocationLifecycleTick` in domain module       | New persistence fields, UI, report notes      |
| Due week = max(`discoveryWeek`, `containmentWeek`, last `statusHistory.week`) + `monitoringCadenceWeeks` | Minor-anomaly / extranormal hooks |
| Default chain: `active` → `monitor_only` → `archived`; `utility_use` → `archived` | SPE-88 parent Done / SPE-1310 case lifecycle |
| One lifecycle step per location per tick when `week >= dueWeek`      | Intake ↔ location cross-link                  |
| Call from `advanceWeek` after week increment (`result.week`), read `outputWeeklyState` | Storage policy (SPE-1314) |
| Targeted domain + `advanceWeek` integration tests                    |                                               |
| Slice doc (this file) + backlog handoff                              |                                               |

## Acceptance

- [x] Empty `unexplainedLocationRecords` map is a no-op without throw
- [x] Locations unchanged while `week < monitoringDueWeek`
- [x] `active` advances to `monitor_only` when due; `monitor_only` / `utility_use` advance to `archived` when due
- [x] Append-only `statusHistory`; one step per location per week; idempotent re-apply
- [x] Terminal fixtures (`LIFECYCLE_CHAIN`, `REMOTE_MONITOR` when not due) byte-stable through tick
- [x] Neutralized without authorization does not advance under strict validation
- [x] `npm run lint` + targeted tests + persistence regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/unexplainedLocationWeeklyLifecycle.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/unexplainedLocationWeeklyLifecycle.test.ts`, `src/test/advanceWeek.unexplainedLocation.integration.test.ts` |
| Plan   | `planning/unexplained-location-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Case escalation from unexplained locations | SPE-1310 | Slice 3 cadence advance only |
| Cover-story matcher / site board UI | Downstream UX owners | Explicitly out of slice |
| `pending_reactivation` and `disputed` automation | Follow-up | Terminal / manual posture in slice 3 |

## See also

- `planning/unexplained-location-registry-slice-2.md`
- `planning/extranormal-event-registry-slice-3.md`
- `planning/minor-anomaly-item-registry-slice-3.md`
