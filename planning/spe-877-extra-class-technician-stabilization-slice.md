# SPE-877 — Extra-class technician stabilization

| Field               | Value                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                         |
| **Linear**          | Parent [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**. Slice child ID pending local create. |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**                                              |
| **Branch**          | `cursor/spe-877-extra-class-technician-stabilization-3400`                                                                                                                   |
| **Base `main` SHA** | `86c2080d6e28b25bcdd734e10bedcbb3e59525f0`                                                                                                                                   |

## Boundary

Open the existing SPE-2862 technician relieve/clear writer to parsed `pressure_seal` and
`interlock` identities. Thread required `classId` into `resolveTechnicianStabilization` and look up
`getContainmentClassCadenceSpec(classId).compensatingControlId`. Unknown or omitted class fail
closed; do not default to blast-door. Mixed class/control pairings fail closed.

Relax `canStabilizeContainmentClassDeficiency` / `stabilizeContainmentClassDeficiency` from
`classId === 'blast_door'` to parsed `isContainmentClassId`. Store/UI keep the existing SPE-2869
command; projection already reads the domain query. `allowHardStopRelief` stays only on this
writer. Inspection sticky hard-stop is unchanged.

Do not call `persistContainmentBarrierCoupling` from stabilize. Do not debit SPE-1027 stock. Do not
flip SPE-2851 `condition`.

## Stabilization contract

Same relieve/clear as blast-door, per authored class:

| Class           | Hard-stop relieves to       | Compensating continue clears to |
| --------------- | --------------------------- | ------------------------------- |
| `blast_door`    | `secondary_interlock_watch` | `none`                          |
| `pressure_seal` | `backup_gasket_watch`       | `none`                          |
| `interlock`     | `dual_circuit_watch`        | `none`                          |

Each success increments `cycleCount` by 1. `condition`, inventory, lots, `damagedEquipmentQueue`,
and `lastInspectionWeek` stay unchanged. Ordinary / `none` / missing / malformed still fail closed.

## Determinism and compatibility

- command remains `stabilizeContainmentClassDeficiency` in `src/domain/equipmentInstance.ts`;
- success still uses `applyEquipmentInstanceTransition` with `allowHardStopRelief`;
- emit `equipment.containment_class_stabilized` with the instance class and that class's control;
- valid extra-class events hydrate as history without replaying mutations;
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event schema version stay unchanged.

## Deferred

| Item or mechanic                              | Owner or prerequisite                                                                                       | Reason                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| SPE-1027 stock consume of a named part        | [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part) / SPE-1027 | Blocked: no SPE-1027 debit port; do not invent `GameState.inventory` debit                |
| Barrier recouple on technician relief         | later SPE-877 child                                                                                         | Blast-door stabilize does not recouple today; extra-class stabilize matches that contract |
| Seed `equipment-instance-blast-door-workshop` | this SPE-877 child (`planning/spe-877-seed-blast-door-workshop-slice.md`) | Shipped: starting-state seeds the authored SPE-2866 identity without remapping extra-class workshop quality |
| Additional SPE-113 stations                   | later SPE-877 child                                                                                         | Mutation-stations child already froze one blast-door bench                                |
| Extra-class workshop quality                  | later SPE-877 child                                                                                         | SPE-2866 stays blast-door only                                                            |
| Mid-week inspect command                      | later SPE-877 child                                                                                         | Week-close remains the production inspect path                                            |

## Acceptance

- `pressure_seal` hard-stop → `backup_gasket_watch`; `interlock` hard-stop → `dual_circuit_watch`
- each class clears its own compensating continue to `none`
- `cycleCount` +1; `inService` true after hard-stop relief; `condition` unchanged
- omitted / unknown class / mixed pairing / ordinary / `none` / missing fail closed
- store/UI shows Stabilize for eligible extra-class rows and emits `equipment.containment_class_stabilized`
- stabilize does not write SPE-2868 membranes
- parent SPE-877 remains Backlog; SPE-2870 stays blocked

## Linear issue body

**Title:** Extra-class technician stabilization (`pressure_seal` / `interlock`)

**Parent:** SPE-877

Mechanic: same SPE-2862 relieve/clear contract for all `CONTAINMENT_CLASS_IDS`. Resolver requires
`classId` and uses that cadence spec's `compensatingControlId`. Writer accepts parsed containment
classes. Store/UI reuse the existing command. Fail closed for omitted/unknown class, mixed
class/control, ordinary, `none`, missing, and malformed. Do not recouple membranes. Do not consume
SPE-1027 stock.

Linear child ID pending local create (Cloud Agent Linear MCP `needsAuth`).

## Validation

- Targeted Vitest: `src/test/containmentClassInspection.contract.test.ts`, `src/test/equipmentInstance.contract.test.ts`, `src/app/store/gameStore.test.ts`, `src/features/equipment/equipmentView.test.ts`, `src/features/equipment/EquipmentPage.test.tsx`, `src/test/events.validation.test.ts`, `src/test/eventFeedView.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
