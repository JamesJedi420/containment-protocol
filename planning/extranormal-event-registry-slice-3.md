# SPE-2105 — Extranormal event registry weekly monitoring hook (slice 3)

One-page implementation plan. Linear: child under [SPE-2105](https://linear.app/spectranoir/issue/SPE-2105). Follows shipped slice 2 (`planning/extranormal-event-registry-slice-2.md`, PR #2488).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2315 — Extranormal event registry weekly monitoring/closure advance hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2315) |
| **Status** | **Shipped** — PR #2494 @ `91fa6cf7`                                                                        |
| **Parent** | [SPE-2105](https://linear.app/spectranoir/issue/SPE-2105) — registry anchor (slice 1–2 shipped)            |
| **Branch** | `spe-2105-extranormal-event-registry-weekly-monitoring-slice-3`                                          |
| **Base `main` SHA** | `79ff0fbf`                                                                                          |

## Goal

Wire persisted `extranormalEventRecords` into `advanceWeek` so monitoring windows expire deterministically and `monitor_only` closure advances when the until-week is reached.

## Prerequisite (on `main` @ `79ff0fbf`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/extranormalEventRegistry.ts` (SPE-2105 / PR #2426)         |
| Persistence          | `extranormalEventRecords` on `GameState` (SPE-2312 / PR #2488)       |
| Intake weekly hook pattern | `src/domain/informationIntakeWeeklyCorroboration.ts` + `advanceWeek` post-`finalizeEvents` |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyExtranormalEventMonitoringTick` in domain module         | New persistence fields, UI, report notes      |
| Call from `advanceWeek` after week increment (`result.week`)       | Minor-anomaly / unexplained-location hooks    |
| Targeted domain + `advanceWeek` integration tests                    | Intake ↔ extranormal cross-link               |
| Slice doc (this file) + backlog handoff                              | SPE-2105 parent Done / SPE-88 parent closure  |

## Acceptance

- [x] Empty `extranormalEventRecords` map is a no-op without throw
- [x] Records with `monitoringUntilWeek` unchanged while `week < monitoringUntilWeek`
- [x] When `week >= monitoringUntilWeek`, `monitoringUntilWeek` is cleared (byte-stable other fields)
- [x] `monitor_only` advances to `sourceless_closed` when monitoring expires
- [x] Re-applying tick for same post-expiry week is idempotent
- [x] `npm run lint` + targeted tests + persistence regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/extranormalEventWeeklyMonitoring.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/extranormalEventWeeklyMonitoring.test.ts`, `src/test/advanceWeek.extranormalEvent.integration.test.ts` |
| Plan   | `planning/extranormal-event-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Intake report ↔ extranormal event linkage | SPE-854 follow-up | Out of weekly-hook boundary |
| Case escalation transitions from extranormal records | Case lifecycle owners | Slice 3 monitoring expiry only |
| Cover-story matcher / event board UI | Downstream UX owners | Explicitly out of slice |

## See also

- `planning/extranormal-event-registry-slice-2.md`
- `planning/information-intake-weekly-hook-slice-4.md`
