# SPE-3283 — Paid facility maintenance replenishment

| Field             | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| **Status**        | **Recently shipped**                                      |
| **Linear**        | [SPE-3283](https://linear.app/spectranoir/issue/SPE-3283) |
| **Parent**        | SPE-1052 — remains Backlog                                |
| **Branch**        | `cursor/spe-3283-paid-facility-maintenance`               |
| **Base main SHA** | `ce11a6ba59cd4c89e84baf14f873989396b8dbc1`                |

## Approved governance

Phase 1 assessed existing maintenance replenishment candidate evidence. The user selected an explicit paid package: 100 funding for 10 maintenance hours and 6 parts, with paid establishment of absent legacy budgets. Phase 2 reconciled SPE-1052 ownership; Phase 3 reconciled supporting tests and mandatory contradictions against funding, stockpile, recovery, and week-close authorities. The user approved that boundary and requested implementation of the full plan. Phase 4 created only SPE-3283; no supporting children.

## Contract

- Pure `purchaseFacilityMaintenancePackage(game)` returns `purchased`, `insufficient_funding`, or `invalid`. One successful invocation atomically debits 100 funding and adds 10 hours / 6 parts to the existing dedicated budget. Blocked outcomes preserve GameState identity; repeated paid orders are allowed.
- Validate raw authoritative funding before canonical normalization. Reuse `getCanonicalFundingState`, `applyFundingExpense`, and `recomputeBudgetPressure`; synchronize game/agency/canonical funding and record reason `facility_maintenance_package`, source ID `facility-maintenance-package`.
- Absent budgets start at zero only for a paid purchase. Malformed budgets and unsafe resulting balances fail closed. Hydration grants nothing.
- The store action revalidates current state. The existing `/agency` maintenance panel shows package/price/canonical funding, accessible blocked explanations, and immediately refreshed balances through a pure projection.
- Purchase and recovery are separate orders. Preserve debt, closed-week marker, time, reports, inventory, equipment capacity, named parts, and unrelated state. No new save field/version/event, procurement listing, recurring grant, scheduling, or automatic repair.

## Validation

- Focused purchase/domain/funding/store/projection/UI/production-route tests: 6 files / 65 tests passed. Full regression includes the final projection immutability assertion: 856 files / 9,311 tests passed.
- Full lint, changed-file formatting, audit-index, theme-contract and backlog-handoff verifiers passed. Six iterative pre-ship passes completed without unresolved in-boundary findings.
- Persistence testing caught existing funding-history deduplication dropping repeated same-week package expenses. Preserve this repeatable reason/source pair while retaining all other funding deduplication; explicit regression verifies both behaviors and three sequential purchases.
- Browser inventory was empty; visual screenshot verification unavailable. Rendered-component accessibility and real production-route purchase/recovery tests passed.
- Local Node 24; required Node 22 runs in hosted CI. Build is outside this slice because of documented baseline type-contract drift.

Repository Recently shipped denotes the merge-ready handoff. Linear remains In Progress until merge; independent full-diff review and hosted CI are pending.

## Deferred

No approved in-boundary deferrals or new candidate scope. Conversion, recurring allocation, scheduling/reporting, and broader collapse/scar mechanics remain outside this approved boundary. SPE-1052 stays Backlog; shipped dependencies stay Done.
