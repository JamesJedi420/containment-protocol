# SPE-3191 — Player-ordered facility maintenance recovery

| Field             | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| **Status**        | **Recently shipped**                                      |
| **Linear**        | [SPE-3191](https://linear.app/spectranoir/issue/SPE-3191) |
| **Parent**        | SPE-1052 — remains Backlog                                |
| **Branch**        | `cursor/spe-3191-player-ordered-facility-recovery`        |
| **Base main SHA** | `0bb826788742ce1cb6c0d562df9b8fea6c982960`                |

## Approved governance and contradictions

Phase 1 assessed a single store-action/UI boundary over the shipped adapter and budget. Phase 2 reconciled ownership under SPE-1052. Phase 3 reconciled supporting tests and mandatory contradictions: the player issues a facility order; immediate application preserves SPE-3119 closed-week ownership. The user requested implementation of the complete plan including phase approvals. Phase 4 created only SPE-3191. No supporting children.

Preserve SPE-3182 recovery costs, SPE-3184 atomic budget/debt application, SPE-3190 fresh-only initialization, and SPE-3119 accrual/replay semantics. Equipment capacity, named-part stock, specialist capacity, and campaign scars retain their existing owners. SPE-1052 remains Backlog; shipped dependencies remain Done.

## Contract

- `orderFacilityMaintenanceRecovery(): void` revalidates current GameState through the domain adapter on each invocation; only recovered commits a new game. Other statuses preserve store/game identity.
- Agency Command exposes one compact panel with debt, domain pressure, available hours/parts, required cost and blocked explanations. Order facility recovery is enabled only for a recovered preview; state refreshes immediately.
- A pure projection delegates recovery and pressure decisions to domain owners; unavailable axes remain unavailable. No threshold or cost policy in UI.
- Preserve lastProcessedWeek, time, reports and unrelated authorities. No new field, migration, route, event kind, scheduling, auto-repair, replenishment, conversion, equipment repair or scar changes.

## Validation

- Focused recovery/store/projection/UI tests: 5 files / 96 tests passed. Final preview and persistence refinement rerun: 3 files / 29 tests passed.
- Final full regression: 854 files / 9,282 tests passed. An earlier overlapping run loaded the previous preview module against the updated assertion; the stable full rerun passed.
- Full lint and focused final-change lint passed; audit-index, theme-contract and backlog-handoff verifiers passed. Changed-file formatting and diff checks passed.
- Six iterative pre-ship passes completed: scope/integration, edge cases, determinism/state, regression, documentation and cleanup. No unresolved in-boundary findings.
- Browser inventory was empty, so visual screenshot inspection was unavailable. Rendered-component tests verify accessible descriptions, blocked states and immediate refresh.
- Local Node 24; required Node 22 validation runs in hosted CI. Build remains outside this slice because of documented baseline type-contract drift.

Repository Recently shipped is the merge-ready handoff status. Linear stays In Progress until merge; independent full-diff review and hosted CI remain pending.

## Deferred

No approved in-boundary deferrals. Replenishment, conversion, scheduling/reporting and broader collapse recovery remain existing candidate evidence under SPE-1052; this slice does not approve or create those boundaries. No new candidate discovered.
