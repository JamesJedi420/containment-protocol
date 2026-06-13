# SPE-1888 — Welfare-debt matrix records GameState persistence (slice 10)

One-page implementation plan. Linear: child under [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) (create/link slice issue on merge). Follows shipped slice 9 (`planning/welfare-debt-accounting-registry-slice-9.md`, PR #2786) and grooming [SPE-2453](https://linear.app/spectranoir/issue/SPE-2453).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2454 — Welfare-debt matrix records GameState persistence (slice 10)](https://linear.app/spectranoir/issue/SPE-2454) |
| **Parent** | [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) — parent stays **Backlog** until full SPE-1047/1131 scope + SPE-1882 deferred items close |
| **Branch** | `spe-1888-welfare-debt-matrix-persistence-slice-10`                                                        |
| **Status** | **In progress**                                                                                            |
| **Base `main` SHA** | `d737e829`                                                                                          |

## Goal

Persist validated [SPE-1047](https://linear.app/spectranoir/issue/SPE-1047) `FactionEthicsMatrixRecord` and [SPE-1131](https://linear.app/spectranoir/issue/SPE-1131) `MoralLegalAccountabilityMatrixRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Pass persisted maps through welfare-debt mirror compose and `advanceWeek` cross-link surfacing — no full matrix policy engines.

## Prerequisite (on `main` @ `d737e829`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Matrix schema anchor | `factionEthicsMatrixRegistry.ts`, `moralLegalAccountabilityMatrixRegistry.ts` (slice 9 / PR #2786) |
| Cross-link compose   | `welfareDebtAccountingCrossLinks.ts` optional map pass-through (slice 9) |
| Weekly surfacing     | `welfareDebtAccountingCrossLinkSurfacing.ts` (slice 8 / PR #2763)      |
| Grooming slice 5     | `planning/spe-1888-parent-acceptance-review-slice-5.md` (SPE-2453)   |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `factionEthicsRecords` / `accountabilityMatrixRecords` on `GameState` | Full SPE-1047 parent AC                     |
| `sanitizeFactionEthicsMatrixRecords` / `sanitizeMoralLegalAccountabilityMatrixRecords` + `runTransfer` hydrate | Full SPE-1131 parent AC                 |
| Default `{}` in `createStartingState`                              | Mission triage chips                          |
| Mirror + `advanceWeek` matrix map pass-through to cross-link compose | Weekly matrix-only surfacing guard change   |
| Targeted persistence + integration tests                           | SPE-1888 parent Done                          |
| Slice doc (this file) + backlog handoff                            | Full SPE-1882 coercive protocol model         |

## Acceptance

- [x] Empty maps default on starting state and hydrate without throw
- [x] Valid fixtures round-trip through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] Mirror cross-link labels hydrate matrix wired refs when maps on state
- [x] `advanceWeek` preserves matrix maps and passes them into cross-link compose when sibling maps coexist
- [x] Opaque fallback retained when matrix maps absent on state
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/factionEthicsMatrixRegistry.ts`, `src/domain/moralLegalAccountabilityMatrixRegistry.ts`, `src/domain/models.ts`, `src/domain/welfareDebtAccountingCrossLinkSurfacing.ts`, `src/domain/welfareDebtAccountingCrossLinkWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Features | `src/features/operations/welfareDebtAccountingMirrorView.ts`      |
| Tests  | `src/test/matrixRecordsRegistryPersistence.test.ts`, `src/test/advanceWeek.welfareDebtAccountingCrossLink.integration.test.ts`, `src/features/operations/welfareDebtAccountingMirrorView.test.ts` |
| Plan   | `planning/welfare-debt-accounting-registry-slice-10.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Weekly report matrix-only surfacing guard | SPE-1888 follow-up | Slice 8 guard unchanged; matrix labels surface when bundles/protocols coexist |
| Full faction ethics policy engine | SPE-1047 | Parent AC remainder beyond schema anchor |
| Full accountability matrix engine | SPE-1131 | Parent AC remainder beyond schema anchor |
| Full coercive contained-person protocol model | SPE-1882 | Out of registry wave |
| SPE-1888 parent Done | SPE-1888 | Full SPE-1047/1131 parent scope still open |

## See also

- `planning/welfare-debt-accounting-registry-slice-9.md`
- `planning/spe-1888-parent-acceptance-review-slice-5.md`
- `planning/truth-layer-record-registry-slice-2.md` — persistence pattern (SPE-2448)
