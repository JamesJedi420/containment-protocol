# SPE-2870 — Named-part repair consume

| Field               | Value                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                  |
| **Linear**          | [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part)                                      |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — stays **Backlog**       |
| **Stock owner**     | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog** |
| **Branch**          | `cursor/spe-2870-named-part-repair-consume-3400`                                                                                      |
| **Base `main` SHA** | `1f25345ed4a80a6b24c32b22c223419bbc5a6144`                                                                                            |

## Boundary

On successful [SPE-2851](https://linear.app/spectranoir/issue/SPE-2851) stored `blast_door` repair,
call [SPE-2887](https://linear.app/spectranoir/issue/SPE-2887) `consumeFacilityStock` atomically
with `repairStoredEquipmentInstanceCondition`. Debit exactly one `blast_door_hinge_seal` from
optional `GameState.facilityStockpile`. Fail closed if stock is missing or zero: no
`damaged` → `operational`, no `equipment.instance_condition_repaired`.

Ordinary identities remain ungated (no part, no debit). Extra-class still fails SPE-2861
suitability. Do not consume on stabilize or inspect. Do not recode the consume helper. Do not
invent catalog `GameState.inventory` / `adjustInventoryQuantity` debit. Do not seed production
stock. Do not implement SPE-1027 zones, quarantine, hauling, staging, capacity, spoilage, lots, or
access control. Do not bump `GAME_STORE_VERSION`. Do not reopen SPE-2827 / SPE-2848. Do not pick
SPE-2847.

## Seam

`resolveStoredEquipmentInstanceConditionRepair` checks named-part stock after SPE-2861 suitability
ok. Missing or zero fail-closes `stock_unavailable`. `repairStoredEquipmentInstanceCondition` then
applies the SPE-2851 condition flip and, when a part is required, calls `consumeFacilityStock` on
the transitioned state. Consume failure discards the transition and returns the original caller
`state`. Ordinary / Combat Stim paths skip consume. Store still appends
`equipment.instance_condition_repaired` only when `result.ok`. Hydration through
`parseFacilityStockpile` does not re-debit; a second repair of an operational copy fail-closes
`condition_already_operational`. Ordinary Equipment projections reuse this preview for
`canRepairCondition` and surface `stock_unavailable` so the command is disabled and explained.

## Deferred

| Item or mechanic                          | Owner or prerequisite                                                                                             | Why deferred                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| SPE-1027 zones / quarantine / hauling     | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) | Full parent stockpile AC                         |
| Production starting stock                 | SPE-1027                                                                                                          | SPE-2887 deferred seed; this child consumes only |
| Extra-class named spare parts             | later SPE-877 child                                                                                               | Suitability still `invalid_class`                |
| SPE-113 tags, operators, legality, curses | later SPE-877 / SPE-113 child                                                                                     | Out of this repair-consume boundary              |

## Acceptance

- Success debit of `blast_door_hinge_seal` by one on stored blast-door repair
- Missing or zero stock fail-closed; no condition flip; no repair event
- Ordinary identities still repair without debit
- Extra-class still fail SPE-2861 suitability
- Hydration replay does not re-debit
- Parent SPE-877 remains Backlog; SPE-1027 remains Backlog

## Linear issue body

See Linear [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part).

## Validation

- Targeted Vitest: `src/test/equipmentInstance.contract.test.ts` SPE-2870 cases; `src/app/store/gameStore.test.ts` repair consume; `src/test/containmentClassWeekClose.contract.test.ts` repair after week-close; `src/features/equipment/equipmentView.test.ts` stock-gated `canRepairCondition`; `src/features/equipment/EquipmentPage.test.tsx` disabled blast-door repair without stock
- `npm run lint`
- `npm run verify:backlog-handoff`
