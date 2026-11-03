# SPE-2854 — Equipped Fabricated Ordinary-Equipment Instance Return-to-Lot

| Field      | Value                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped**                                                                                                    |
| **Linear** | [SPE-2854](https://linear.app/spectranoir/issue/SPE-2854/equipped-fabricated-ordinary-equipment-instance-return-to-lot) |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)                 |
| **Branch** | `jamesdyedbq/spe-2854-equipped-fabricated-ordinary-equipment-instance-return-to`                                        |

## Boundary

This slice lets one exact fabricated-origin ordinary-equipment identity that is equipped on an
idle active agent return to its source lot without a separate Unequip step. Provenance, condition,
payload, Combat Stim, recovery, lot-bound, and inventory-capacity gates run **before** relocate so
a failed command does not unequip. The command then relocates to stored (idle-agent gate + slot
clear) and reuses SPE-2848 `returnFabricatedOrdinaryEquipmentInstanceToLot`.

Success deletes only that registry identity, credits aggregate inventory by one, decrements the
source lot `trackedInstanceUnits` by one, and leaves lot `quantity` unchanged. Catalog
re-aggregation of fabricated-origin stays fail-closed (`fabricated_provenance_required`). Events
reuse `equipment.instance_reaggregated` with reason `fabricated_lot_return`. No location fields and
no save/schema bump.

Combat Stim equipped dispose / re-agg / lot-return, catalog-only slots, repair, mission loss, and
readiness/stow remain outside this command. Non-idle equipped agents fail closed with
`agent_not_idle` and mutate nothing.

## Determinism and compatibility

- equipped fabricated ordinary identities reuse `relocateEquipmentInstance` then the existing
  stored SPE-2848 helper so slot-clear and idle gating stay single-sourced;
- store action `returnFabricatedStoredEquipmentInstanceToLot` is unchanged (no new action name);
- successful return emits one `equipment.instance_reaggregated` event with reason
  `fabricated_lot_return`;
- event payloads do not gain location fields; `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the
  operation-event schema version remain unchanged;
- Equipment loadout UI exposes an accessible return-to-lot confirmation on instance-backed
  fabricated ordinary slots, distinct from Unequip, destroy, and catalog re-agg.

## Deferred

| Item or mechanic                                   | Owner or prerequisite | Reason                                           |
| -------------------------------------------------- | --------------------- | ------------------------------------------------ |
| Combat Stim equipped dispose / re-agg / lot-return | SPE-2827 child        | Overdrive provenance and specialized dose policy |
| Repair, damage production                          | SPE-877               | Integrity program beyond identity commands       |
| Ready versus stowed                                | SPE-1658              | Access-state layer remains separately owned      |
| Mission loss                                       | SPE-2827 child        | Requires authored lifecycle triggers             |
| Catalog-only slot lot-return                       | out of scope          | Unequip remains the aggregate-backed path        |

## Validation

- idle equipped fabricated ordinary return-to-lot: identity gone, slot empty, inventory +1,
  `trackedInstanceUnits` −1, lot `quantity` unchanged, sibling preserved, one
  `fabricated_lot_return` event;
- fail-closed without unequip: `agent_not_idle`, Combat Stim, payload, damaged, missing/mismatched
  lot, catalog-origin, catalog re-agg of fabricated-origin;
- stored SPE-2848 regression;
- loadout UI confirmation distinct from Unequip / destroy / catalog re-agg;
- focused equipment/event/UI tests, lint, repository verifiers, formatting, and targeted Vitest.
