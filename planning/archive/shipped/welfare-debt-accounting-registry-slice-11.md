# SPE-1888 — Welfare-debt matrix-only weekly cross-link surfacing (slice 11)

One-page implementation plan. Linear: child under [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) (create/link slice issue on merge). Follows shipped slice 10 (`planning/welfare-debt-accounting-registry-slice-10.md`, PR #2790).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1888 slice 11 — Welfare-debt matrix-only weekly cross-link surfacing (create on merge)                |
| **Parent** | [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) — parent stays **Backlog** until full SPE-1047/1131 scope + SPE-1882 deferred items close |
| **Branch** | `spe-1888-welfare-debt-matrix-surfacing-slice-11`                                                          |
| **Status** | **Shipped** — PR #2791 @ `d4675f06`                                                         |
| **Base `main` SHA** | `bca68c09`                                                                                          |

## Goal

Relax the slice 8 sibling gate in `composeAllWelfareDebtAccountingCrossLinkSummaries` and `advanceWeek` so persisted `factionEthicsRecords` / `accountabilityMatrixRecords` alone can surface `welfare_debt.accounting_cross_link` weekly notes when welfare-debt records exist — no full SPE-1047/1131 policy engines, no mission triage.

## Prerequisite (on `main` @ `bca68c09`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Matrix GameState persistence | `factionEthicsMatrixRegistry.ts`, `moralLegalAccountabilityMatrixRegistry.ts`, `runTransfer.ts` (slice 10 / PR #2790) |
| Cross-link compose   | `welfareDebtAccountingCrossLinks.ts` optional map pass-through (slice 9) |
| Weekly surfacing     | `welfareDebtAccountingCrossLinkSurfacing.ts` (slice 8 / PR #2763)      |
| Grooming slice 5     | `planning/spe-1888-parent-acceptance-review-slice-5.md` (SPE-2453)   |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Relax surfacing sibling gate for matrix maps                       | Full SPE-1047 parent AC                     |
| `advanceWeek` matrix-only weekly note path                         | Full SPE-1131 parent AC                 |
| Targeted surfacing + integration tests                             | Mission triage chips                          |
| Slice doc (this file) + backlog handoff                            | SPE-1888 parent Done                          |
| Return SPE-1888 parent **Backlog** if auto-closed on child Done    | Full SPE-1882 coercive protocol model         |

## Acceptance

- [x] Empty matrix maps keep opaque fallback / no-op when all sibling maps empty
- [x] Matrix-only fixtures surface weekly notes with hydrated wired refs
- [x] `advanceWeek` emits matrix-only cross-link notes when maps persist on state
- [x] Bundles/protocol coexistence path unchanged
- [x] `npm run lint` + targeted tests green
- [x] SPE-1888 parent **Backlog** on Linear after merge (auto-close drift — manual return required)

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/welfareDebtAccountingCrossLinkSurfacing.ts`, `src/domain/welfareDebtAccountingCrossLinkWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/welfareDebtAccountingCrossLinkSurfacing.test.ts`, `src/test/advanceWeek.welfareDebtAccountingCrossLink.integration.test.ts` |
| Plan   | `planning/welfare-debt-accounting-registry-slice-11.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full faction ethics policy engine | SPE-1047 | Parent AC remainder beyond schema anchor |
| Full accountability matrix engine | SPE-1131 | Parent AC remainder beyond schema anchor |
| Full coercive contained-person protocol model | SPE-1882 | Out of registry wave |
| SPE-1888 parent Done | SPE-1888 | Full SPE-1047/1131 parent scope still open |

## See also

- `planning/welfare-debt-accounting-registry-slice-10.md`
- `planning/spe-1888-parent-acceptance-review-slice-5.md`
