# SPE-2104 — Minor anomaly item registry weekly disposition hook (slice 3)

One-page implementation plan. Linear: child under [SPE-2104](https://linear.app/spectranoir/issue/SPE-2104). Follows shipped slice 2 (`planning/minor-anomaly-item-registry-slice-2.md`, PR #2492).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2316 — Minor anomaly item registry weekly disposition/custody advance hook (slice 3)](https://linear.app/spectranoir/issue/SPE-2316) |
| **Status** | **Shipped** — PR #2496 @ `a84e293e`                                                                        |
| **Parent** | [SPE-2104](https://linear.app/spectranoir/issue/SPE-2104) — registry anchor (slice 1–2 shipped)          |
| **Branch** | `spe-2104-minor-anomaly-item-registry-weekly-disposition-slice-3`                                          |
| **Base `main` SHA** | `ae78790b`                                                                                          |

## Goal

Wire persisted `minorAnomalyItemRecords` into `advanceWeek` so custody review due weeks (derived from `staffNoteProvenance` hooks) advance intake dispositions deterministically with append-only `statusHistory`.

## Prerequisite (on `main` @ `ae78790b`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/minorAnomalyItemRegistry.ts` (SPE-2104 / PR #2428)         |
| Persistence          | `minorAnomalyItemRecords` on `GameState` (SPE-2314 / PR #2492)       |
| Sibling weekly hook  | `src/domain/extranormalEventWeeklyMonitoring.ts` (SPE-2315 / PR #2494) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyWeeklyMinorAnomalyItemDispositionTick` in domain module        | New persistence fields, UI, report notes      |
| One disposition step per item per tick when `week >= custodyReviewDueWeek` | Extranormal / unexplained-location hooks |
| Default chain: `recovered` → `pending_review` → `stored`; legacy `status` overrides target when valid | SPE-88 parent Done / SPE-1310 case lifecycle |
| Call from `advanceWeek` after week increment (`result.week`), read `outputWeeklyState` | Storage policy (SPE-1314) |
| Targeted domain + `advanceWeek` integration tests                    | Intake ↔ minor-item cross-link                |
| Slice doc (this file) + backlog handoff                              |                                               |

## Acceptance

- [x] Empty `minorAnomalyItemRecords` map is a no-op without throw
- [x] Items unchanged while `week < custodyReviewDueWeek` (max `staffNoteProvenance.week`)
- [x] `recovered` / `pending_review` advance one step when due; append-only `statusHistory`
- [x] Legacy `status` schedules target disposition when valid and distinct from current
- [x] Invalid post-transition record left unchanged (validation gate; destroyed requires auth ref)
- [x] Re-applying tick for same week after advance is idempotent (one step per item per week)
- [x] `npm run lint` + targeted tests + persistence regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/minorAnomalyItemWeeklyDisposition.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/minorAnomalyItemWeeklyDisposition.test.ts`, `src/test/advanceWeek.minorAnomalyItem.integration.test.ts` |
| Plan   | `planning/minor-anomaly-item-registry-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| `stored` → `assigned` / `staff_use` automation | SPE-1314 / follow-up | Out of intake custody-review boundary |
| Intake report ↔ minor item linkage | SPE-854 follow-up | Out of weekly-hook boundary |
| Case escalation from minor items | SPE-1310 | Slice 3 custody advance only |

## See also

- `planning/minor-anomaly-item-registry-slice-2.md`
- `planning/extranormal-event-registry-slice-3.md`
