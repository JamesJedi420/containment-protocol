# SPE-2855 — Equipped Combat Stim Instance Dispose, Re-aggregation, and Lot-return

| Field      | Value                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| **Status** | **Recently shipped**                                                                                               |
| **Linear** | [SPE-2855](https://linear.app/spectranoir/issue/SPE-2855/equipped-combat-stim-instance-dispose-re-aggregation-and) |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)            |
| **Branch** | `jamesdyedbq/spe-2855-equipped-combat-stim-lifecycle`                                                              |

## Boundary

This slice lets one exact Combat Stim identity equipped on an idle active agent be disposed,
catalog-re-aggregated, or returned to its fabricated lot without a separate Unequip step. Dose,
provenance, overdrive/recovery, condition, and lot gates run **before** relocate so a failed
command does not unequip. The command then relocates to stored (idle-agent gate + slot clear) and
reuses SPE-2844 dispose, SPE-2845 catalog re-agg, or SPE-2850 fabricated lot-return.

| Path           | Stored owner                                         | Equipped compose rule                                                                                                                                                 |
| -------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dispose        | `destroyStoredCombatStimInstance` (SPE-2844)         | Idle + equipped; fail closed if overdrive/recovery debt owns ID; any canonical dose (0/2, 1/2, 2/2); no inventory credit                                              |
| Catalog re-agg | `reaggregateStoredCombatStimInstance` (SPE-2845)     | Idle + equipped + operational + **2/2** + **no** fabricationOrigin; inventory +1; event `manual_untracking`                                                           |
| Lot-return     | `returnFabricatedCombatStimInstanceToLot` (SPE-2850) | Idle + equipped + operational + **2/2** + valid `fabricationOrigin`; inventory +1; `trackedInstanceUnits` −1; lot `quantity` immutable; event `fabricated_lot_return` |

Loadout confirmations are distinct from Unequip / ordinary destroy / ordinary lot-return. No new
event types, location fields on payloads, or save/schema bump. Mission loss, repair on equipped,
and ready/stow remain outside this command. Non-idle equipped agents fail closed with
`agent_not_idle` and mutate nothing.

## Determinism and compatibility

- equipped Combat Stim identities reuse `relocateEquipmentInstance` then the existing stored
  dispose / catalog re-agg / lot-return helpers so slot-clear and idle gating stay single-sourced;
- store actions `disposeStoredCombatStimInstance`, `reaggregateStoredCombatStimInstance`, and
  `returnFabricatedCombatStimInstanceToLot` stay unchanged (no new action names);
- successful dispose emits one `equipment.combat_stim_disposed` event;
- successful catalog re-agg emits one `equipment.combat_stim_reaggregated` with reason
  `manual_untracking`;
- successful lot-return emits one `equipment.combat_stim_reaggregated` with reason
  `fabricated_lot_return`;
- event payloads do not gain location fields; `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the
  operation-event schema version remain unchanged;
- Equipment loadout UI exposes accessible dispose / re-agg / lot-return confirmations on
  instance-backed Combat Stim slots, distinct from Unequip and ordinary lifecycle controls.

## Deferred

| Item or mechanic          | Owner or prerequisite | Reason                               |
| ------------------------- | --------------------- | ------------------------------------ |
| Mission loss              | SPE-2827 child        | Requires authored lifecycle triggers |
| Repair, damage production | SPE-877               | Integrity program; store then repair |
| Ready versus stowed       | SPE-1658              | Access-state layer separately owned  |
| Catalog-only slot paths   | out of scope          | Unequip remains aggregate-backed     |
| SPE-2847                  | do not pick           | Out of SPE-2827 remaining sequence   |

## Linear hygiene (session)

Linear MCP was `needsAuth` in this Cloud Agent session. Apply these updates when authenticated:

1. **Create child** under SPE-2827 (Backlog → In Progress when coding): title **Equipped Combat Stim
   instance dispose, re-aggregation, and lot-return**; body mirrors this Boundary table; link this
   slice doc and branch.
2. **Comment on SPE-2827:** SPE-2854 Done; SPE-2855 is recommended next; mission loss remains
   unissued.
3. **Patch SPE-2827 description** Remaining / Recommended next → SPE-2855 (drop SPE-2854 as next).
4. After PR open: comment PR URL on SPE-2855; keep In Progress until merge; then Done + merge
   comment; parent stays Backlog.

## Validation

- idle equipped dispose: identity gone, slot empty, inventory unchanged, correct dispose event;
- idle equipped catalog re-agg: 2/2 catalog-origin → inventory +1, `manual_untracking`;
- idle equipped lot-return: fabricated 2/2 → inventory +1, tracked −1, quantity unchanged,
  `fabricated_lot_return`;
- fail closed **without unequip:** `agent_not_idle`; active overdrive / recovery debt; partial /
  depleted on re-agg/lot-return; damaged; fabricated-origin on catalog re-agg; catalog-origin on
  lot-return; missing/mismatched lot;
- stored SPE-2844 / SPE-2845 / SPE-2850 regression; ordinary SPE-2853 / SPE-2854 regression;
- loadout UI confirmations distinct from Unequip / ordinary controls;
- focused equipment/event/UI tests, lint, `verify:backlog-handoff`, formatting, and targeted Vitest.
