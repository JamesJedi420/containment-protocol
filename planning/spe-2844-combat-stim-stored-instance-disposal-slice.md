# SPE-2844 — Combat Stim Stored-Instance Disposal Command

| Field      | Value                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| **Status** | **In Progress**                                                                                                     |
| **Linear** | [SPE-2844](https://linear.app/spectranoir/issue/SPE-2844/combat-stim-stored-instance-disposal-command)              |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)             |
| **Branch** | `jamesdyedbq/spe-2844-combat-stim-stored-instance-disposal`                                                         |

## Boundary

This slice adds an explicit player command to permanently dispose one stored Combat Stim instance
by exact identity. The command deletes only the selected registry key and leaves aggregate
`combat_stims` inventory, damaged aggregate state, fabricated lots, recovery queues and outcomes,
loadouts for other instances, and material stock unchanged.

Disposal is allowed for any canonical dose state (0/2, 1/2, or 2/2). Equipped instances, missing or
unsafe IDs, malformed payloads, active or completed recovery claims, and instances retaining active
Combat Stim overdrive or recovery-debt provenance fail closed. Repeated or stale commands are
no-ops and emit no duplicate event.

## Determinism and compatibility

- stored Combat Stim identities project in stable code-unit order with exact ID, dose, and condition
  labels;
- an accessible destructive confirmation names the exact identity and dose state and explains that
  disposal is permanent, does not restore aggregate stock, and is distinct from deconstruction
  recovery;
- successful commands emit one strict `equipment.combat_stim_disposed` event with week, identity,
  canonical definition snapshot, condition, dose snapshot, and fixed `manual_disposal` reason;
- event hydration preserves valid disposal history while the absent registry identity remains absent;
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event schema version remain unchanged.

## Deferred

| Item or mechanic                        | Owner or prerequisite | Reason                                                       |
| --------------------------------------- | --------------------- | ------------------------------------------------------------ |
| Combat Stim re-aggregation              | SPE-2827 child        | Inverse materialization requires specialized dose policy    |
| Live-dose material recovery             | SPE-1055 child        | Recovery outputs for partial doses remain separately owned   |
| Equipped-instance disposal              | SPE-2827 child        | Requires unequip or mission-loss lifecycle triggers          |
| SPE-1027 refill and facility stock      | SPE-1027              | Replenishment port not yet authoritative                       |
| Damaged-instance repair economics       | SPE-877               | Condition lifecycle remains separately owned                   |
| Auto-Scrap instance selection           | SPE-2749 child        | Automation remains aggregate-only                              |
| Custody and readiness restrictions      | SPE-1055 / SPE-1658   | Protected/live access states remain deferred                   |

## Validation

- exact successful disposal for stored 2/2, 1/2, and 0/2 canonical instances with unchanged
  aggregate, recovery, loadout, and sibling preservation;
- fail-closed equipped, missing, unsafe, malformed, recovery-claimed, and overdrive-provenance
  paths;
- strict producer, payload-schema, source-system, hydration, and save round-trip tests;
- Combat-Stim-specific projection, accessible destructive confirmation, and event-feed labels;
- focused combat-stim/equipment/event/UI tests, lint, repository verifiers, and full Vitest suite.
