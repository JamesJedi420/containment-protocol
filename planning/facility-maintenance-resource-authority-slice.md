# SPE-3184 — Facility recovery resource authority and atomic adapter

| Field             | Value                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                                                                  |
| **Linear**        | [SPE-3184](https://linear.app/spectranoir/issue/SPE-3184/facility-maintenance-recovery-resource-authority-and-atomic) |
| **Parent**        | SPE-1052 — remains Backlog                                                                                            |
| **Branch**        | `cursor/facility-maintenance-resource-authority`                                                                      |
| **Base main SHA** | `fd28507dc9a43b03813631673c60d0154e3aec9e`                                                                            |

## Goal and boundary

Persist a dedicated explicit owner-supplied facility recovery budget and apply SPE-3182 proposals atomically through a pure GameState adapter. Do not wire gameplay, create resource income, convert existing stock, or change equipment-maintenance and scar ownership.

## Contract

- Optional `GameState.facilityMaintenanceRecoveryResources` is the sole facility recovery resource authority, containing `maintenanceHours` and `partsReserve`.
- Reuse exported `parseFacilityMaintenanceRecoveryResources`: own nonnegative safe-integer fields, detached frozen output. Missing/malformed hydrate absent; valid zero remains present; no fallback or starting/reset provisioning. Save envelope remains version 7.
- `applyFacilityMaintenanceRecovery(game)` returns frozen `{ status, game, recovery }`. Validate maintenance state against `game.week`, then delegate decisions and costs to SPE-3182.
- Only `recovered` replaces GameState with both debt and resource outputs together. Other statuses retain original GameState identity. Preserve `lastProcessedWeek` and every unrelated authority.
- Costs remain SPE-2261 strained 4/2, degraded 10/6, critical 20/12; never charge chained logistics separately. Recovered-output replay consumes nothing; unchanged-input calls remain proposals, not global transactions.

## Validation

- Focused adapter/resolver/week-close: 3 files / 112 tests passed. Adapter rerun after strengthening preservation/reset assertions: 25 tests passed.
- Full `npm run test:run`: 852 files / 9,255 tests passed.
- `npm run lint`, changed-file formatting, audit-index, theme-contract, and backlog-handoff verification passed.
- `npm run build` retains 672 baseline TypeScript diagnostics, with identical per-file/error-code counts and no diagnostics in the recovery module or new tests. Expanded GameState diagnostic text and source line offsets reflect the additive field; no added drift.
- Six pre-ship passes (scope/integration, edge cases, determinism/state, regression, documentation, cleanup) completed without unresolved in-boundary findings. Hydration freeze loss was caught and fixed by restoring the validated budget after generic cleanup.

Repository status **Recently shipped** denotes the merge-ready handoff; Linear remains In Progress until merge.

## Deferred

| Mechanic                             | Owner                                                             | Boundary and reason                                                                        |
| ------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Provisioning and replenishment       | Create later SPE-1052 child                                       | Define campaign allocation before adding income; this slice accepts explicit budgets only. |
| Conversion from labor or named parts | Create later SPE-1052 child coordinating existing resource owners | No implicit transfer from equipment-maintenance capacity or SPE-2887 stock.                |
| Playable command and UI              | Create later SPE-1052 child                                       | Consume the atomic adapter once provisioning policy is owned.                              |
| Scheduling and reporting             | Create later SPE-1052 child                                       | No automatic week-close recovery or new events; preserve SPE-3119 accrual order.           |
| Other collapse and scars             | Existing collapse owners; SPE-1051 / SPE-3121                     | Only maintenance debt clears; campaign consequences retain separate ownership.             |

Keep SPE-3182 Done and SPE-1052 Backlog. Close SPE-3184 only after merge.
