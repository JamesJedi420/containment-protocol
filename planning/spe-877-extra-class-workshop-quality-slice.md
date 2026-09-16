# SPE-877 — Extra-class workshop quality

| Field               | Value                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                         |
| **Linear**          | Parent [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**. Slice child ID pending local create. |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**                                              |
| **Branch**          | `cursor/spe-877-extra-class-workshop-quality-3400`                                                                                                                           |
| **Base `main` SHA** | `0865187fcd10ec31b4b4e958162317a9e5bae663`                                                                                                                                   |

## Boundary

Freeze two additional authored SPE-2866 department→instance mappings so stored `pressure_seal` and
`interlock` identities compose SPE-2782 `equipmentCondition` at the existing week-close wrapper.
Same table as blast-door: `none` / compensating continue → `good`; hard-stop / missing / malformed /
wrong class → `poor`. Seed the authored extra-class IDs in starting-state without inventory debit
so a fresh game is not permanently `poor`.

Do not remap `department:field-containment` / `equipment-instance-blast-door-workshop`. Do not steal
`department:biohazard-response` (SPE-2792). Do not change SPE-2782 grader semantics. Do not consume
SPE-1027 stock. Do not recouple barriers on stabilize. Do not add SPE-113 tags, operators, legality,
or curses. Authored workshop identity destroy/re-agg protection shipped as SPE-2877. Do not bump
`GAME_STORE_VERSION` unless hydration evidence requires it (it does not). Do not reopen SPE-2827 /
SPE-2848. Do not pick SPE-2847.

## Mapping contract

| Department                         | Instance ID                                 | Class           |
| ---------------------------------- | ------------------------------------------- | --------------- |
| `department:field-containment`     | `equipment-instance-blast-door-workshop`    | `blast_door`    |
| `department:emergency-response`    | `equipment-instance-pressure-seal-workshop` | `pressure_seal` |
| `department:procurement-logistics` | `equipment-instance-interlock-workshop`     | `interlock`     |

Unmapped departments (`department:records-analysis`, `department:biohazard-response`, others) keep
caller-owned `equipmentCondition`. Extra-class identities on the blast-door slot stay `poor`.
SPE-2851 `condition` is not the mapped signal.

## Seed contract

| Field                  | Pressure-seal                               | Interlock                               |
| ---------------------- | ------------------------------------------- | --------------------------------------- |
| `instanceId`           | `equipment-instance-pressure-seal-workshop` | `equipment-instance-interlock-workshop` |
| `definitionId`         | `ward_seals`                                | `ward_seals`                            |
| `location`             | `{ state: 'stored' }`                       | `{ state: 'stored' }`                   |
| `condition`            | `operational`                               | `operational`                           |
| `containmentIntegrity` | `pressure_seal` / week 1 / cycle 0 / `none` | `interlock` / week 1 / cycle 0 / `none` |
| Inventory debit        | none (`ward_seals` starting stock stays 0)  | none                                    |

Do not call `instantiateEquipmentInstance` for these seeds. Omitted extra-class IDs still fail-close
`poor`. Legacy omit of the registry still hydrates `{}`. Historical receipts do not regrade.

## Deferred

| Item or mechanic                                       | Owner or prerequisite                                                                                       | Reason                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Barrier recouple on technician relief                  | [SPE-2876](https://linear.app/spectranoir/issue/SPE-2876/barrier-recouple-on-technician-relief) (`planning/spe-877-barrier-recouple-technician-relief-slice.md`) | Shipped: technician-relief persist omits `flow_restraint` on `none`; `zone_breach` stays sticky |
| Protect authored workshop identity from destroy/re-agg | [SPE-2877](https://linear.app/spectranoir/issue/SPE-2877/protect-authored-workshop-identity-from-destroyre-agg) (`planning/spe-877-protect-workshop-identity-slice.md`) | Shipped: authored SPE-2866 IDs fail-close ordinary destroy/re-agg without stock credit |
| SPE-1027 stock consume of a named part                 | [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part) / SPE-1027 | Blocked: no SPE-1027 debit port                                                                     |
| SPE-113 tags, operators, legality, curses              | later SPE-877 / SPE-113 child                                                                               | Out of this mapping/seed boundary                                                                   |
| Additional live quality axes                           | SPE-1028 / SPE-2771                                                                                         | This child owns only the equipment axis                                                             |

## Acceptance

- `department:emergency-response` with stored `pressure_seal` `none` / compensating continue → `equipmentCondition: good`
- `department:procurement-logistics` with stored `interlock` `none` / compensating continue → `equipmentCondition: good`
- hard-stop / missing / malformed / wrong class on those mappings → `poor`
- field-containment blast-door path unchanged; extra-class identity on the blast-door slot → `poor`
- biohazard room path unchanged; `department:records-analysis` stays unmapped
- starting-state seeds both extra-class IDs without debiting `ward_seals`
- omitted extra-class IDs fail-close `poor`; hydrate/save keeps matching seeds
- historical receipts do not regrade; `advanceWeek` hook count unchanged
- parent SPE-877 remains Backlog; SPE-2870 stays blocked

## Linear issue body

**Title:** Extra-class workshop quality

**Parent:** SPE-877

Mechanic: freeze additional authored SPE-2866 department→instance mappings so stored `pressure_seal`
and `interlock` identities compose SPE-2782 `equipmentCondition` at the existing week-close wrapper.
`department:emergency-response` → `equipment-instance-pressure-seal-workshop`;
`department:procurement-logistics` → `equipment-instance-interlock-workshop`. Same table as
blast-door. Seed those IDs without inventory debit. Do not remap field-containment. Do not steal
biohazard-response.

Linear child ID pending local create (Cloud Agent Linear MCP `needsAuth`).

## Validation

- Targeted Vitest: `src/test/departmentWorkshopLiveIntegrityQuality.integration.test.ts`, `src/test/extraClassWorkshopIntegrityQualitySeed.contract.test.ts`, `src/test/fieldContainmentBlastDoorWorkshopSeed.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
