# SPE-877 — Pressure-seal integrity-labor station

| Field               | Value                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                         |
| **Linear**          | Parent [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**. Slice child ID pending local create. |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**                                              |
| **Branch**          | `cursor/spe-877-pressure-seal-integrity-bench-3400`                                                                                                                          |
| **Base `main` SHA** | `2146f6bee3907a16035561ae7c8ed46d118687c5`                                                                                                                                   |

## Boundary

Freeze one additional authored SPE-113 integrity-labor station on the existing SPE-2867 runtime:
`pressure_seal_integrity_bench` for stored `pressure_seal` identities. Mutate in place through
`applyEquipmentInstanceTransition` with `allowStationMutation`. Preserve instance ID and provenance.
Fail closed. Distinct from SPE-2851 repair and SPE-2862 stabilize.

Do not ship SPE-113 tags, operators, black-market legality, or curses. Do not add an interlock bench.
Do not remap extra-class workshop quality. Do not consume SPE-1027 stock. Do not recouple barriers on
stabilize. Do not debit inventory for the blast-door workshop seed. Do not bump `GAME_STORE_VERSION`
unless hydration evidence requires it (it does not). Do not reopen SPE-2827 / SPE-2848. Do not pick
SPE-2847.

## Station contract

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Station        | `pressure_seal_integrity_bench`               |
| Eligible class | `pressure_seal`                               |
| Location       | stored                                        |
| Mutation field | `stationMutation: { stationId, appliedWeek }` |
| Tradeoff       | `containmentIntegrity.cycleCount` +1          |
| Unchanged      | `condition`, deficiency, inventory, lots      |

Pure resolver `resolvePressureSealIntegrityLabor` in `src/domain/equipmentStationMutation.ts`.
Command `applyPressureSealIntegrityLabor` applies that result. Parse accepts both authored station
ids. Hydration and transitions keep a stamp only when it matches the instance class
(`blast_door` ↔ `blast_door_integrity_bench`, `pressure_seal` ↔ `pressure_seal_integrity_bench`).
Mixed pairing, interlock, unknown station ids, and stamps without a parsed class drop as
`malformed_station_mutation`. The blast-door bench stays exclusive to `blast_door`. The workshop
seed `equipment-instance-blast-door-workshop` stays ineligible for this station.

Successful labor hydrates as `equipment.instance_station_mutated` with reason `integrity_labor`.
Valid events are history and do not replay the mutation. Compensating continue requires
`backup_gasket_watch`. `hard_stop` requires `inService: false`; `none` and compensating continue
require `inService: true`. Stamped identities still fail-close catalog re-aggregation and fabricated
ordinary return-to-lot.

## Deferred

| Item or mechanic                                       | Owner or prerequisite                                                                                       | Reason                                                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Interlock integrity-labor station                      | this SPE-877 child (`planning/spe-877-interlock-integrity-bench-slice.md`)                                  | Shipped `interlock_integrity_bench` on the SPE-2867 runtime                                              |
| SPE-113 tags, operators, legality, curses              | later SPE-877 / SPE-113 child                                                                               | Out of this one-station boundary                                                                         |
| Extra-class workshop quality                           | this SPE-877 child (`planning/spe-877-extra-class-workshop-quality-slice.md`)                               | Shipped extra-class workshop mappings + no-debit seeds; field-containment blast-door path unchanged      |
| Barrier recouple on technician relief                  | later SPE-877 child                                                                                         | Stabilize still does not recouple membranes                                                              |
| SPE-1027 stock consume of a named part                 | [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part) / SPE-1027 | Blocked: no SPE-1027 debit port                                                                          |
| Protect authored workshop identity from destroy/re-agg | later SPE-877 child                                                                                         | Player can destroy or catalog-re-agg the blast-door seed; re-agg would credit never-debited `ward_seals` |

## Acceptance

- stored `pressure_seal` identity receives `stationMutation` for `pressure_seal_integrity_bench` and `cycleCount` +1
- `condition` and deficiency are unchanged, including sticky hard-stop
- repeat apply fail-closes with `station_mutation_already_applied`
- ordinary / blast-door / interlock / equipped / missing / workshop seed fail closed with no mutation
- blast-door bench still exclusive to `blast_door`; mixed class/station stamps drop
- generic transitions cannot invent the stamp
- hydrate/save round-trip keeps a matching pressure-seal stamp; mixed event payloads drop
- stamped identities fail-close catalog re-aggregation
- no SPE-113 catalog; no workshop remapping; no SPE-1027 consume; no store-version bump
- parent SPE-877 remains Backlog; SPE-2870 stays blocked

## Linear issue body

**Title:** Pressure-seal integrity-labor station

**Parent:** SPE-877

Mechanic: freeze one additional authored SPE-113 station `pressure_seal_integrity_bench` on the
existing SPE-2867 runtime. Stored `pressure_seal` identities mutate in place via
`applyEquipmentInstanceTransition` with `allowStationMutation`. Stamp + `cycleCount` +1. Fail closed
for wrong class, mixed pairing, already-applied, equipped, missing, and the blast-door workshop seed.
Do not ship tags/operators/legality/curses. Do not add an interlock bench. Do not remap extra-class
workshop quality. Do not consume SPE-1027 stock.

Linear child ID pending local create (Cloud Agent Linear MCP `needsAuth`).

## Validation

- Targeted Vitest: `src/test/equipmentStationMutation.contract.test.ts`, `src/test/equipmentInstance.contract.test.ts`, `src/test/events.validation.test.ts`, `src/test/eventFeedView.test.ts`, `src/features/equipment/equipmentView.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
