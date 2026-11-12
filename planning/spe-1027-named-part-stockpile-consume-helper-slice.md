# SPE-2887 — Named-part facility stockpile consume helper

| Field               | Value                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                  |
| **Linear**          | [SPE-2887](https://linear.app/spectranoir/issue/SPE-2887/named-part-facility-stockpile-consume-helper) — child of SPE-1027            |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog** |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**     |
| **Branch**          | `cursor/spe-1027-named-part-stockpile-consume-3400`                                                                                   |
| **Base `main` SHA** | `f1f40007ccb71f893aa1c934779354b2696b1d36`                                                                                            |

## Boundary

Ship a pure domain consume helper plus an optional persisted facility stockpile map that is not
catalog `GameState.inventory`. Reuse frozen SPE-2861 spare-part IDs. Debit exactly one unit.
Fail closed when stock is missing or zero. Hydration omit or malformed map becomes empty.

Do not call the helper from `repairStoredEquipmentInstanceCondition`, store, or UI. Do not
implement SPE-2870 repair-consume. Do not implement SPE-1027 zones, quarantine, hauling, staging,
capacity, spoilage, lots, reserved or expired partitions, or access control. Do not seed
`createStartingState()` production stock. Do not credit from catalog inventory. Do not add an
operation event. Do not bump `GAME_STORE_VERSION`. Do not reopen SPE-2827 / SPE-2848. Do not pick
SPE-2847. Do not add SPE-113 tags, operators, legality, or curses.

## Seam

`GameState.facilityStockpile` is an optional `Partial<Record<SparePartId, number>>`. Domain
`parseFacilityStockpile` hydrates through `runTransfer` like other optional maps: known spare-part
keys with positive integers survive; unknown, integer-index, prototype-unsafe, negative,
non-integer, and zero siblings drop independently; omit becomes empty.

`consumeFacilityStock(state, stockId)` always decrements one. Success drops the key at 0 and omits
the field when empty. Missing or zero after parse returns `stock_unavailable` with state unchanged.
Unknown or malformed id returns `invalid_stock_id` with state unchanged. Catalog `inventory` and
`adjustInventoryQuantity` are not this port.

## Deferred

| Item or mechanic                          | Owner or prerequisite                                                                                             | Why deferred                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| SPE-2851 repair debit of named stock      | [SPE-2870](https://linear.app/spectranoir/issue/SPE-2870/spe-1027-stock-consume-of-a-named-part)                  | Repair-consume wiring; port exists after this slice |
| SPE-1027 zones / quarantine / hauling     | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) | Full parent stockpile AC                            |
| SPE-113 tags, operators, legality, curses | later SPE-877 / SPE-113 child                                                                                     | Out of this consume-helper boundary                 |

## Acceptance

- Success debit of `blast_door_hinge_seal` by one
- Missing or zero stock fail-closed; state unchanged
- Catalog inventory unchanged
- Hydration of a saved quantity does not re-debit
- Parent SPE-1027 remains Backlog; SPE-877 remains Backlog; SPE-2870 remains Backlog

## Linear issue body

**Title:** Named-part facility stockpile consume helper

**Parent:** SPE-1027 (SPE-1052 stays Backlog)

See Linear [SPE-2887](https://linear.app/spectranoir/issue/SPE-2887/named-part-facility-stockpile-consume-helper).

## Validation

- Targeted Vitest: `src/test/facilityStockpile.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
