# SPE-2845 — Combat Stim Stored-Instance Re-aggregation Command

| Field      | Value                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| **Status** | **In Progress**                                                                                              |
| **Linear** | [SPE-2845](https://linear.app/spectranoir/issue/SPE-2845/combat-stim-stored-instance-re-aggregation-command) |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)      |
| **Branch** | `jamesdyedbq/spe-2845-combat-stim-stored-instance-re-aggregation-command`                                    |

## Boundary

This slice adds an explicit player command to return one stored Combat Stim instance to aggregate
`combat_stims` inventory by exact identity. The command deletes only the selected registry key and
increments aggregate stock exactly once, failing closed when the increment would exceed safe integer
bounds.

Damaged aggregate state, fabricated lots, recovery queues and outcomes, loadouts for other
instances, and material stock remain unchanged. Re-aggregation is allowed only for full canonical
2/2 instances (symmetric with materialization). Partial 1/2 and depleted 0/2 doses fail closed with
dedicated codes; the player uses SPE-2844 disposal or SPE-2830 recovery for those. Equipped
instances, missing or unsafe IDs, malformed payloads, damaged condition, recovery claims, and
active overdrive or recovery-debt provenance fail closed. Repeated or stale commands are no-ops and
emit no duplicate event. Generic ordinary re-aggregation continues returning
`specialized_reaggregation_required` for Combat Stims.

## Determinism and compatibility

- stored Combat Stim identities project in stable code-unit order with exact ID, dose, and condition
  labels plus independent disposal and re-aggregation eligibility;
- an accessible non-destructive confirmation names the exact identity and dose state and explains
  the one-unit aggregate return, distinct from disposal and ordinary re-aggregation;
- successful commands emit one strict `equipment.combat_stim_reaggregated` event with week,
  identity, canonical definition snapshot, operational condition, dose snapshot, and fixed
  `manual_untracking` reason;
- event hydration preserves valid re-aggregation history while the absent registry identity remains
  absent and inventory credit is not replayed;
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event schema version remain unchanged.

## Deferred

| Item or mechanic                   | Owner or prerequisite | Reason                                                     |
| ---------------------------------- | --------------------- | ---------------------------------------------------------- |
| Partial-dose re-aggregation        | SPE-2827 child        | 1/2 and 0/2 require specialized stock or disposal/recovery |
| Live-dose material recovery        | SPE-1055 child        | Recovery outputs for partial doses remain separately owned |
| Equipped-instance re-aggregation   | SPE-2827 child        | Requires unequip or mission-loss lifecycle triggers        |
| SPE-1027 refill and facility stock | SPE-1027              | Replenishment port not yet authoritative                   |
| Damaged-instance repair economics  | SPE-877               | Condition lifecycle remains separately owned               |
| Auto-Scrap instance selection      | SPE-2749 child        | Automation remains aggregate-only                          |
| Custody and readiness restrictions | SPE-1055 / SPE-1658   | Protected/live access states remain deferred               |

## Validation

- exact successful re-aggregation for stored 2/2 canonical instances with +1 aggregate credit and
  unchanged recovery, loadout, and sibling preservation;
- fail-closed 0/2, 1/2, equipped, missing, unsafe, malformed, damaged, recovery-claimed,
  overdrive-provenance, and aggregate-capacity paths;
- strict producer, payload-schema, source-system, hydration, and save round-trip tests;
- Combat-Stim-specific projection, accessible non-destructive confirmation, and event-feed labels;
- focused combat-stim/equipment/event/UI tests, lint, repository verifiers, and full Vitest suite.
