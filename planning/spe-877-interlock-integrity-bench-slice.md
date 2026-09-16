# SPE-877 — Interlock integrity-labor station

| Field               | Value                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                         |
| **Linear**          | Parent [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**. Slice child ID pending local create. |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**                                              |
| **Branch**          | `cursor/spe-877-interlock-integrity-bench-3400`                                                                                                                              |
| **Base `main` SHA** | `fe1bfbdfd598825119bfb077ce52a20115a74663`                                                                                                                                   |

## Boundary

Freeze one additional authored SPE-113 integrity-labor station on the existing SPE-2867 runtime:
`interlock_integrity_bench` for stored `interlock` identities. Mutate in place through
`applyEquipmentInstanceTransition` with `allowStationMutation`. Preserve instance ID and provenance.
Fail closed. Distinct from SPE-2851 repair and SPE-2862 stabilize.

Do not ship SPE-113 tags, operators, black-market legality, or curses. Do not remap extra-class
workshop quality. Do not consume SPE-1027 stock. Do not recouple barriers on stabilize. Do not debit
inventory for the blast-door workshop seed. Do not bump `GAME_STORE_VERSION` unless hydration
evidence requires it (it does not). Do not reopen SPE-2827 / SPE-2848. Do not pick SPE-2847.

## Station contract

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Station        | `interlock_integrity_bench`                   |
| Eligible class | `interlock`                                   |
| Location       | stored                                        |
| Mutation field | `stationMutation: { stationId, appliedWeek }` |
| Tradeoff       | `containmentIntegrity.cycleCount` +1          |
| Unchanged      | `condition`, deficiency, inventory, lots      |

Pure resolver `resolveInterlockIntegrityLabor` in `src/domain/equipmentStationMutation.ts`. Command
`applyInterlockIntegrityLabor` applies that result. Parse accepts the three authored station ids.
Hydration and transitions keep a stamp only when it matches the instance class (`blast_door` ↔
`blast_door_integrity_bench`, `pressure_seal` ↔ `pressure_seal_integrity_bench`, `interlock` ↔
`interlock_integrity_bench`). Mixed pairing, unknown station ids, and stamps without a parsed class
drop as `malformed_station_mutation`. Blast-door and pressure-seal benches stay exclusive to their
classes. The workshop seed `equipment-instance-blast-door-workshop` stays ineligible for this
station.

Successful labor hydrates as `equipment.instance_station_mutated` with reason `integrity_labor`.
Valid events are history and do not replay the mutation. Compensating continue requires
`dual_circuit_watch`. `hard_stop` requires `inService: false`; `none` and compensating continue
require `inService: true`. Stamped identities still fail-close catalog re-aggregation and fabricated
ordinary return-to-lot.

## Deferred

| Item or mechanic                                       | Owner or prerequisite                                                                                       | Reason                                                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| SPE-113 tags, operators, legality, curses              | later SPE-877 / SPE-113 child                                                                               | Out of this one-station boundary                                                                         |
| Extra-class workshop quality                           | this SPE-877 child (`planning/spe-877-extra-class-workshop-quality-slice.md`)                               | Shipped extra-class workshop mappings + no-debit seeds; field-containment blast-door path unchanged      |
| Barrier recouple on technician relief                  | [SPE-2876](https://linear.app/spectranoir/issue/SPE-2876/barrier-recouple-on-technician-relief) (`planning/spe-877-barrier-recouple-technician-relief-slice.md`) | Shipped: technician-relief persist omits `flow_restraint` on `none`; `zone_breach` stays sticky           |
| SPE-1027 stock consume of a named part                 | [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part) / SPE-1027 | Blocked: no SPE-1027 debit port                                                                          |
| Protect authored workshop identity from destroy/re-agg | [SPE-2877](https://linear.app/spectranoir/issue/SPE-2877/protect-authored-workshop-identity-from-destroyre-agg) (`planning/spe-877-protect-workshop-identity-slice.md`) | Shipped: authored SPE-2866 IDs fail-close ordinary destroy/re-agg without stock credit |

## Acceptance

- stored `interlock` identity receives `stationMutation` for `interlock_integrity_bench` and `cycleCount` +1
- `condition` and deficiency are unchanged, including sticky hard-stop
- repeat apply fail-closes with `station_mutation_already_applied`
- ordinary / blast-door / pressure-seal / equipped / missing / workshop seed fail closed with no mutation
- blast-door and pressure-seal benches stay exclusive to their classes; mixed class/station stamps drop
- generic transitions cannot invent the stamp
- hydrate/save round-trip keeps a matching interlock stamp; mixed event payloads drop
- stamped identities fail-close catalog re-aggregation
- no SPE-113 catalog; no workshop remapping; no SPE-1027 consume; no store-version bump
- parent SPE-877 remains Backlog; SPE-2870 stays blocked

## Linear issue body

**Title:** Interlock integrity-labor station

**Parent:** SPE-877

Mechanic: freeze one additional authored SPE-113 station `interlock_integrity_bench` on the existing
SPE-2867 runtime. Stored `interlock` identities mutate in place via
`applyEquipmentInstanceTransition` with `allowStationMutation`. Stamp + `cycleCount` +1. Fail closed
for wrong class, mixed pairing, already-applied, equipped, missing, and the blast-door workshop seed.
Do not ship tags/operators/legality/curses. Do not remap extra-class workshop quality. Do not consume
SPE-1027 stock.

Linear child ID pending local create (Cloud Agent Linear MCP `needsAuth`).

## Validation

- Targeted Vitest: `src/test/equipmentStationMutation.contract.test.ts`, `src/test/equipmentInstance.contract.test.ts`, `src/test/events.validation.test.ts`, `src/test/eventFeedView.test.ts`, `src/features/equipment/equipmentView.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
