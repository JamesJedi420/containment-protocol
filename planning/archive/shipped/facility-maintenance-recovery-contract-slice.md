# SPE-3182 — Pure facility maintenance debt recovery resolver

| Field             | Value                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                                                       |
| **Linear**        | [SPE-3182](https://linear.app/spectranoir/issue/SPE-3182/pure-facility-maintenance-debt-recovery-resolver) |
| **Parent**        | SPE-1052 — remains Backlog                                                                                 |
| **Branch**        | `cursor/facility-maintenance-recovery-contract`                                                            |
| **Base main SHA** | `843ec00bce65a549e7f231d0c64b09b2295a2721`                                                                 |

## Goal and boundary

Implement `resolveFacilityMaintenanceRecovery(state, resources)` as a pure immutable recovery contract. Reuse the SPE-3119 state parser and SPE-2261 collapse registry; propose recovery only from explicit caller-owned maintenance hours and parts. No GameState fields, migration, store/UI command, automatic week-close recovery, equipment repair changes, or real campaign resource debit.

## Contract

- Accept unknown inputs at the validation boundary. State uses `parseFacilityMaintenanceState`; resources require own `maintenanceHours` and `partsReserve` fields containing nonnegative safe integers.
- Return a frozen discriminated result with `status`. `invalid` proposes no state or resource changes. All valid results include canonical `state`, remaining `resources`, `consumed`, and maintenance-only `collapse`.
- `not_required` retains debt below the active threshold and consumes zero resources. `insufficient_resources` retains both state and resources atomically, consumes zero, and includes `required`.
- Read the direct `maintenance_debt_overrun` record's recovery requirements: strained 4 hours / 2 parts; degraded 10 / 6; critical 20 / 12. Do not add chained logistics recovery costs or duplicate threshold policy.
- `recovered` clears active debt to zero, preserves `lastProcessedWeek`, and returns exact `required`/`consumed` amounts and resource remainder. Recompute collapse from zero maintenance debt.
- Detach and freeze result objects. Applying recovery to its recovered output consumes zero additional resources. Calls against the same unchanged inputs return the same proposal; a future caller must apply state and resource outputs atomically.
- Maintenance-origin workshop stalls disappear when callers compose recovered state with the existing helpers. Replayed closed weeks add no debt; later expanded closes accrue normally. This test composition does not add a production wire.

## Validation

- Focused recovery tests: 48 passed. Related maintenance, collapse, expansion, workshop queue, and specialist week-close tests: 6 files / 180 tests passed.
- Full `npm run test:run`: 851 files / 9,230 tests passed.
- Full `npm run lint`, changed-file formatting checks (new code, test, slice doc and manifest), audit-index, theme-contract, and backlog handoff verification passed. Retain existing backlog/previous-slice formatting to avoid unrelated table churn.
- `npm run build`: same 672 TypeScript diagnostics as base, with no added or removed diagnostics. No diagnostics in the new module or tests. Build remains blocked by pre-existing type-contract drift.
- Six pre-ship audit passes completed: scope/integration, edge cases, determinism/state, regression, documentation, and cleanup. No unresolved in-boundary findings.
- Local runtime: Node 24.18.0 / Vitest 4.1.11; hosted CI uses the required Node 22 and lockfile installation.

Repository handoff uses **Recently shipped** for the merge-ready branch; Linear remains **In Progress** until merge is confirmed.

## Deferred

| Mechanic                                         | Owner                                          | Boundary and reason                                                                                                  |
| ------------------------------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Resource ownership, provisioning, and conversion | Later SPE-1052 child; existing resource owners | Hours/parts are abstract inputs. Do not debit equipment-maintenance capacity or convert named-part stock implicitly. |
| Playable recovery command and UI                 | Later SPE-1052 child                           | Requires an owned budget and atomic application of state/resource outputs; this child only proposes changes.         |
| Week-close application and reporting             | Later SPE-1052 child                           | Must define scheduling, authoritative resource debit, and report semantics; SPE-3119 accrual/order stays unchanged.  |
| Other collapse recovery and campaign scars       | Existing collapse owners; SPE-1051 / SPE-3121  | Recovery targets maintenance debt only, not independent supply stalls or campaign-wide consequences.                 |

SPE-1052 remains Backlog. Close only SPE-3182 after its PR merges.
