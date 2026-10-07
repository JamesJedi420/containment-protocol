# SPE-3292 — Weekly staff maintenance conversion

| Field             | Value                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                                        |
| **Issue**         | [SPE-3292](https://linear.app/spectranoir/issue/SPE-3292)                                   |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog; completion not claimed |
| **Branch**        | `cursor/spe-3292-maintenance-conversion`                                                    |
| **Base main SHA** | `ad9109a5`                                                                                  |

PR [#4260](https://github.com/JamesJedi420/containment-protocol/pull/4260) carries this delivery. Status and backlog rows describe the merge handoff; they take effect on merge. Keep Linear In Progress until merge and acceptance are verified.

## Approved boundary and recipe prerequisite

Implement SPE-3292 including the approved October 7 Phase 4 reconciliation. The user selected one `pressure_seal_gasket` and one canonical staff-capacity unit for 2 maintenance hours / 1 parts reserve, absent-budget establishment on success, and one success per canonical staff ID per authoritative campaign week.

The existing `PRESSURE_SEAL_SPARE_PART_ID` in `sparePartSuitability` supplies a semantically valid facility-maintenance service spare: it already gates pressure-seal deficiency repair and is owned/consumed by `facilityStockpile`. The authored conversion prepares a maintenance reserve from that gasket. Consumption reduces stock available for direct pressure-seal repairs; the player surface states this tradeoff. Do not add or substitute stock IDs.

## Contract

- Pure preview and command revalidate explicit staff ID, week and current-authority revision; SPE-3135 capacity and SPE-3291 claims remain authoritative.
- Stage commit, exact SPE-2887 stock debit, validated resource credit, successful weekly receipt and canonical release; publish only the complete successful state. Failure preserves all authorities and weekly eligibility.
- Optional versioned `facilityMaintenanceConversionReceipts` records staff ID, week and successful bounded request revision (31-character deterministic FNV-1a/64 token). Equivalent replay does nothing; a fresh exhausted attempt cannot credit or release twice. Corrupt present receipt state, including hybrid unavailable/receipt arms or inherited fields, stays unavailable through persistence. Released staff can perform unrelated work; advancing the canonical week restores recipe eligibility without automatic grants.
- Absent maintenance resources start at zero on success. Malformed budgets, overflow, missing stock and conflicting claims block. Funding, debt, personnel and inventory are not changed by the recipe.
- Agency Command presents requirements, gains, stock tradeoff, explicit staff selection, blockers and reservation destination through existing projection/store/control patterns.

## Validation

- Final full regression passed: 866 files / 9,414 tests with the CI forks pool and eight bounded workers on local Node 24. Hosted CI validates Node 22 with the pinned install.
- An earlier run with concurrent typecheck hit one production-route lazy-loading timeout. The unchanged route file passed all four tests in isolation, and the final full run with typecheck complete passed all 9,414 tests. Hosted CI on the final commit remains the merge gate.
- Focused boundary/integration run passed 38 tests; the earlier Agency Command and allocation regression run passed 60 tests. Coverage includes canonical debit/credit and release, same/different staff weekly use, next-week restoration, stale previews, rollback after provisional claim or debit, replay, corrupt/sparse/duplicate/future receipts, stable ordering, inherited stock, legacy establishment, normalize/hydrate/export/manual-save/migration/localStorage persistence, reset, recovery composition, conflicts, pointer and keyboard activation, and accessible announcements.
- Typecheck remains at 673 baseline diagnostics, with no new file/error-code entries. Lint, audit-index, backlog-handoff and theme-contract checks pass. Changed small artifacts pass formatting; unrelated large-file baseline formatting drift is retained.
- Six iterative pre-ship passes covered scope/integration, edge cases, determinism/state, regression, documentation, and cleanup. Fixes ensured stable receipt ordering, consistent own-property stock preview, and baseline-safe types. Independent review hardened hybrid/inherited receipts; external review added stock-only publication to preserve unrelated state and bounded revision tokens to prevent quadratic save growth. Follow-up domain/store/UI/allocation/boundary tests passed 51 tests, including a 501-receipt campaign and unrelated funding/market/personnel drift. No unresolved in-boundary findings.
- Final external review also required exclusive union arms in the existing staff-allocation normalizer, so a corrupt hybrid unavailable/commitments payload cannot become free capacity during hydration. This is supporting validation inside SPE-3292's approved malformed-authority boundary; it adds no new allocation scope or owner. Regression coverage exercises direct conversion, normalization, hydration, manual saves and exports, plus the existing allocation/workshop and save-system tests. All 477 tests across eight affected files passed after this supporting guard; scoped lint passed.
- Native controls share one command path. Browser visual QA and physical-controller verification were unavailable: the session reports no browser providers. Agency Command rendering and interaction were verified by component tests.

Advisor consultation is unavailable because the installed skill requires an escalated launcher prohibited by session tool policy. Root owns integration and completion review.

## Deferred

No approved in-boundary deferrals or new candidate scope. Parent SPE-1052 remains open; research throughput and broader allocation consumers remain separate owners.
