# SPE-3190 — Initial facility maintenance allocation

| Field             | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| **Status**        | **Recently shipped**                                      |
| **Linear**        | [SPE-3190](https://linear.app/spectranoir/issue/SPE-3190) |
| **Parent**        | SPE-1052 — remains Backlog                                |
| **Branch**        | `cursor/spe-3190-initial-facility-maintenance-allocation` |
| **Base main SHA** | `26d502700ae4f596db02f8723a3958274db8edef`                |

## Approved boundary and governance

Phase 1 identified initial allocation as candidate scope. Phase 2 reconciled ownership under SPE-1052; user selected 10 hours / 6 parts and new campaigns only, then approved. Phase 3 reconciled supporting tests and reviewed contradictions: allocation is an authored endowment, not conversion from equipment capacity, funding, or named parts. User authorized phase approvals and implementation. Phase 4 created SPE-3190; SPE-3184 and SPE-3182 stay Done.

## Contract

- Allocate existing `facilityMaintenanceRecoveryResources` with 10 maintenance hours and 6 parts in `createStartingState()`. Reset and configured fresh runs reuse this initialization; each campaign owns an independent budget.
- Hydrate/import existing campaign records without grants. Preserve valid budgets, including zero; absent/malformed budgets remain absent even with a provisioned fallback.
- Preserve existing non-record/invalid-envelope fallback semantics: replacement fresh campaigns receive the endowment. Do not add a migration or envelope bump.
- Reuse SPE-3184 atomic recovery and SPE-3182 costs. Starting allocation funds one degraded repair or two strained repairs, not a critical repair. Preserve debt accrual and closed-week markers.
- No recurring income, conversion, resource debit from other owners, recovery command/UI, automatic repair, or reporting.

## Validation

- Focused recovery/resolver/store tests: 3 files / 176 tests passed. Strengthened production week-close assertion rerun: 28 tests passed.
- Full regression: 852 files / 9,258 tests passed.
- Lint, backlog-handoff, audit-index, and theme-contract verification passed; changed-file formatting checked.
- Six pre-ship passes completed: scope/integration, edge cases, determinism/state, regression, documentation/authoring, and cleanup. No unresolved in-boundary findings.
- Local Node is 24; CI validates the required Node 22 environment. Build is not used as a gate because repository baseline type-contract drift is outside this initialization slice.

Repository status Recently shipped denotes the merge-ready handoff; Linear remains In Progress until merge.

## Deferred

| Mechanic                       | Disposition                                             | Boundary                                                    |
| ------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------- |
| Replenishment and conversion   | SPE-1052 candidate evidence; separate approval required | No recurring grants or resource-owner transfers.            |
| Playable recovery command/UI   | SPE-1052 candidate evidence; separate approval required | Allocation alone does not expose a player recovery action.  |
| Automatic repair and reporting | SPE-1052 candidate evidence; separate approval required | Preserve SPE-3119 week-close ordering and replay ownership. |

Keep SPE-1052 Backlog. Close SPE-3190 only after merge.
