# SPE-2853 — Equipped Ordinary-Equipment Instance Destruction and Re-aggregation

| Field      | Value                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped**                                                                                                          |
| **Linear** | [SPE-2853](https://linear.app/spectranoir/issue/SPE-2853/equipped-ordinary-equipment-instance-destruction-and-re-aggregation) |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)                       |
| **Branch** | `jamesdyedbq/spe-2853-equipped-ordinary-equipment-instance-destruction-and-re`                                                |

## Boundary

This slice lets one exact ordinary-equipment identity that is equipped on an idle active agent be
destroyed or catalog-re-aggregated without a separate Unequip step. The command relocates the
identity to stored (idle-agent gate + slot clear) then reuses SPE-2842 destruction or SPE-2843
catalog re-aggregation so no intermediate stored copy is a player-visible extra step.

Destruction deletes only the selected registry key and leaves aggregate inventory unchanged.
Catalog re-aggregation deletes that identity and credits inventory exactly once under the existing
safe-integer gate. Fabricated-origin catalog re-agg stays fail-closed; SPE-2848 lot-return stays
stored-only.

Combat Stims, generic payload-bearing instances, catalog-only slots, repair, mission loss, and
readiness/stow remain outside this command. Non-idle equipped agents fail closed with
`agent_not_idle` and mutate nothing.

## Determinism and compatibility

- equipped ordinary identities reuse `relocateEquipmentInstance` then the existing stored destroy
  or catalog re-agg helpers so slot-clear and idle gating stay single-sourced;
- successful destroy emits one `equipment.instance_destroyed` event with reason `manual_disposal`;
- successful catalog re-agg emits one `equipment.instance_reaggregated` event with reason
  `manual_untracking`;
- event payloads do not gain location fields; `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the
  operation-event schema version remain unchanged;
- Equipment loadout UI exposes accessible destroy and re-agg confirmations on instance-backed
  ordinary slots, distinct from Unequip (which stores the copy).

## Deferred

| Item or mechanic                      | Owner or prerequisite | Reason                                           |
| ------------------------------------- | --------------------- | ------------------------------------------------ |
| Combat Stim equipped dispose / re-agg | SPE-2827 child        | Overdrive provenance and specialized dose policy |
| Equipped fabricated lot-return        | SPE-2854              | Shipped as sibling of stored SPE-2848            |
| Repair, damage production             | SPE-877               | Integrity program beyond identity commands       |
| Ready versus stowed                   | SPE-1658              | Access-state layer remains separately owned      |
| Mission loss                          | SPE-2827 child        | Requires authored lifecycle triggers             |
| Catalog-only slot destroy / re-agg    | out of scope          | Unequip remains the aggregate-backed path        |

## Validation

- equipped ordinary destroy on idle agent: identity gone, slot empty, inventory/lots/recovery/siblings
  unchanged, one destroy event;
- equipped ordinary catalog re-agg on idle operational non-fabricated identity: identity gone, slot
  empty, inventory +1, one re-agg event;
- fail-closed `agent_not_idle`, Combat Stim, payload, recovery-claimed, fabricated-origin catalog
  re-agg, missing/stale;
- stored SPE-2842 / SPE-2843 regression;
- loadout UI confirmations distinct from Unequip;
- focused equipment/event/UI tests, lint, repository verifiers, formatting, and targeted Vitest.
