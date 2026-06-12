# SPE-1888 — Welfare-debt cross-link weekly report surfacing (slice 8)

One-page implementation plan. Linear: [SPE-2444](https://linear.app/spectranoir/issue/SPE-2444) (child under [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888)). Follows shipped slice 7 (`planning/welfare-debt-accounting-registry-slice-7.md`, PR #2760).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2444 — Welfare-debt cross-link surfacing in weekly report notes (slice 8)](https://linear.app/spectranoir/issue/SPE-2444) |
| **Parent** | [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) — parent stays **Backlog** until SPE-1047 / SPE-1131 matrix AC met |
| **Branch** | `spe-1888-welfare-debt-cross-link-surfacing-slice-8`                                                       |
| **Status** | **Shipped** — PR #2763 @ `47ad133e`                                                                        |
| **Base `main` SHA** | `b183ea76`                                                                                          |

## Goal

Surface existing `composeAllWelfareDebtAccountingCrossLinks` / `formatWelfareDebtAccountingCrossLinkLabels` output as read-only weekly report notes when welfare-debt records coexist with integrated-health bundles and/or coercive protocol records — mirror the naming-hazard surfacing pattern ([SPE-2406](https://linear.app/spectranoir/issue/SPE-2406)).

## Prerequisite (on `main` @ `b183ea76`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Cross-link compose   | `welfareDebtAccountingCrossLinks.ts` (SPE-1888 slice 7 / PR #2760)     |
| Ledger audit + mirror | `welfareDebtAccountingRegistry.ts`, `welfareDebtAccountingMirrorView.ts` |
| Naming-hazard template | `informationIntakeNamingHazardCrossLinkSurfacing.ts` (SPE-2406)      |
| Weekly note hook pattern | `advanceWeek.ts` naming-hazard + coercive reconciliation blocks   |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `welfareDebtAccountingCrossLinkSurfacing.ts` label helpers         | SPE-1888 slice 7 compose changes              |
| `welfareDebtAccountingCrossLinkWeeklyReportNotes.ts`               | SPE-1047 faction ethics engine                |
| `welfare_debt.accounting_cross_link` report note type              | SPE-1131 accountability matrix                |
| `advanceWeek` hook after welfare-debt tick                         | New persistence fields                        |
| Targeted unit + integration tests                                  | Mission triage chips                          |
| Slice doc (this file) + backlog handoff                            | SPE-1888 parent Done                          |

## Surfacing contract

- **Read-only** — compose at read time; no new GameState fields.
- **Safe labels** — opaque wired refs from `formatWelfareDebtAccountingCrossLinkLabels` only.
- **Empty maps** — no-op; no throw.
- **Hydrated truth only** — invalid/skipped records do not re-surface.
- **Sibling gate** — welfare-debt records plus non-empty integrated-health and/or coercive protocol maps.
- **Byte-stable ordering** — debt refs and link labels sorted on repeat.
- **Weekly notes** — one note per summary with cross-link labels; emit after welfare-debt tick.

## Acceptance

- [x] Empty maps no-op without throw
- [x] Weekly report note uses audit-line labels when fixtures coexist
- [x] `advanceWeek` integration asserts cross-link note when fixtures coexist
- [x] `reportNoteTypeAudit` covers new note type
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/welfareDebtAccountingCrossLinkSurfacing.ts`, `src/domain/welfareDebtAccountingCrossLinkWeeklyReportNotes.ts`, `src/domain/sim/advanceWeek.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| View   | `src/features/report/reportNoteView.ts`                               |
| Tests  | `src/test/welfareDebtAccountingCrossLinkSurfacing.test.ts`, `src/test/advanceWeek.welfareDebtAccountingCrossLink.integration.test.ts`, `src/test/reportNoteTypeAudit.test.ts`, `src/features/report/reportNoteView.test.ts` |
| Plan   | `planning/welfare-debt-accounting-registry-slice-8.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Faction ethics matrix runtime | SPE-1047 | Parent AC remainder |
| Moral-legal accountability matrix | SPE-1131 | Same |
| Mission triage chips for welfare-debt cross-links | Mission triage | Blocked per backlog |
| SPE-1888 parent Done | SPE-1888 | Ethics/accountability matrix AC still open |

## See also

- `planning/welfare-debt-accounting-registry-slice-7.md`
- `planning/naming-hazard-cross-link-surfacing-slice-1.md`
