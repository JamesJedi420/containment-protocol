# SPE-2856 — Mission-Fatality Equipped-Instance Loss

| Field      | Value                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped**                                                                                    |
| **Linear** | [SPE-2856](https://linear.app/spectranoir/issue/SPE-2856/mission-fatality-equipped-instance-loss)       |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority) |
| **Branch** | `jamesdyedbq/spe-2856-mission-fatality-equipped-instance-loss`                                          |

## Boundary

When mission resolution marks an assigned agent `dead`, destroy/dispose every equipped
instance-backed loadout slot on that carrier (ordinary + Combat Stim) with reason `mission_loss`,
clear that dead carrier's instance-backed compatibility projection, and do not credit aggregate
inventory.

The hook runs inside `applyMissionResolutionAgentMutations` immediately after status → `dead` and
`agent.killed`. It enumerates equipped registry identities for that agent in instance-ID order. It
does not relocate-then-stored: the idle-agent gate would fail on a dead carrier.

| Identity    | Mutation                                                                     | Event                                                                 |
| ----------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Ordinary    | Delete registry key; no inventory or lot mutation                            | `equipment.instance_destroyed` / `mission_loss`                       |
| Combat Stim | Delete registry key; no inventory or lot mutation; skip player dispose gates | `equipment.combat_stim_disposed` / `mission_loss` (canonical payload) |

Catalog-only slots stay projected. Injury and resignation do not run this path. Recovery-claimed
identities are skipped so an existing queue/outcome claim remains the destruction authority.

## Determinism and compatibility

- instance-ID order per dead carrier; fatality list order across assigned agents;
- existing idle equipped destroy/dispose/re-agg/lot-return commands keep `manual_disposal` and
  stored-path behavior;
- event payloads reuse existing types; `mission_loss` is added to the destroy/dispose reason unions;
- no location fields on payloads; `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event
  schema version remain unchanged.

## Deferred

| Item or mechanic                   | Owner or prerequisite | Reason                                      |
| ---------------------------------- | --------------------- | ------------------------------------------- |
| Injury equipped-instance loss      | SPE-2857              | Plan ready; fatality-only trigger in this slice |
| Resignation equipped-instance loss | SPE-2827 child        | Not authored by mission resolution          |
| Re-agg / lot-return on death       | out of scope          | Loss must not credit stock                  |
| Repair, damage production          | SPE-877               | Integrity program beyond identity loss      |
| Ready versus stowed                | SPE-1658              | Access-state layer remains separately owned |
| SPE-2847                           | do not pick           | Out of SPE-2827 remaining sequence          |

## Validation

- fatality ordinary instance-backed slots: identities gone, those slots empty, catalog-only slot
  preserved, sibling/stored identities preserved, inventory unchanged, `mission_loss` destroy
  events in instance-ID order, `agent.killed` still emitted;
- fatality Combat Stim: identity gone, slot empty, inventory unchanged, `mission_loss` dispose;
- injury does not destroy equipped instances;
- recovery-claimed equipped identity skipped;
- event-schema `mission_loss` accepted; event-feed copy distinguishes Mission loss from Manual
  disposal;
- focused mission/event tests, lint, `verify:backlog-handoff`, formatting, and targeted Vitest.
