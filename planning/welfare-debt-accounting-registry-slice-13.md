# SPE-1888 — Welfare-debt weekly matrix projection label surfacing (slice 13)

One-page implementation plan. Linear: child under [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) (create on start).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1888 slice 13 — Welfare-debt weekly matrix projection label surfacing                                  |
| **Parent** | [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) — parent remains **Done** (follow-up weekly mirror slice) |
| **Branch** | `spe-1888-welfare-debt-weekly-matrix-projection-labels-slice-13`                                          |
| **Status** | In progress                                                                                                |
| **Base `main` SHA** | `0990a4e1`                                                                                          |

## Goal

Surface SPE-1047 permissibility verdict and SPE-1131 moral/legal outcome projection labels in weekly `welfare_debt.accounting_cross_link` report notes when matrix maps are hydrated, reusing slice 12 welfare-debt projection formatters as read-only display metadata/content.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Weekly note helper uses slice 12 projection label formatters       | Full SPE-1047 policy engine                  |
| Weekly note content appends matrix projection labels when hydrated | Full SPE-1131 policy engine                  |
| Weekly note metadata includes projection labels                    | Cross-link compose match kind/schema changes |
| Unit + surfacing + advanceWeek matrix-only regression coverage     | Mission triage UI                            |

## Acceptance

- [ ] Matrix maps absent keeps projection labels empty
- [ ] Matrix-only weekly path surfaces projection labels in note content and metadata
- [ ] Existing wired-ref cross-link labels remain unchanged
- [ ] Deterministic label order follows existing cross-link formatter order
- [ ] `npm run test:run -- src/test/welfareDebtAccountingCrossLinkSurfacing.test.ts src/test/advanceWeek.welfareDebtAccountingCrossLink.integration.test.ts` passes
- [ ] `npm run lint` passes

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/welfareDebtAccountingCrossLinkSurfacing.ts`, `src/domain/welfareDebtAccountingCrossLinkWeeklyReportNotes.ts` |
| Tests  | `src/test/welfareDebtAccountingCrossLinkSurfacing.test.ts`, `src/test/advanceWeek.welfareDebtAccountingCrossLink.integration.test.ts` |
| Plan   | `planning/welfare-debt-accounting-registry-slice-13.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full faction ethics policy engine | SPE-1047 | Parent acceptance beyond read-only projection label surfacing |
| Full accountability matrix policy engine | SPE-1131 | Parent acceptance beyond read-only projection label surfacing |
| Coercive protocol weekly projection labels | SPE-1882 slice 18 | Parallel registry thread, not welfare-debt slice boundary |
