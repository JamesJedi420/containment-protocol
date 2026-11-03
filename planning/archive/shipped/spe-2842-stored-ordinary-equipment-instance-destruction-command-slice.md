# SPE-2842 — Stored Ordinary-Equipment Instance Destruction Command

| Field      | Value                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped**                                                                                             |
| **Linear** | [SPE-2842](https://linear.app/spectranoir/issue/SPE-2842/stored-ordinary-equipment-instance-destruction-command) |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)          |
| **Branch** | `jamesdyedbq/spe-2842-stored-ordinary-equipment-instance-destruction-command`                                    |

## Boundary

This slice adds an explicit player command that permanently destroys one exact safe, stored,
payload-free ordinary-equipment identity. The command deletes only the selected registry key and
leaves aggregate inventory, damaged aggregate state, fabricated lots, recovery queues and outcomes,
loadouts, and material stock unchanged.

Combat Stims and generic payload-bearing instances remain outside this command. Equipped, missing,
unsafe, and active or completed recovery-claimed identities fail closed. Repeated or stale commands
are no-ops and emit no duplicate event.

## Determinism and compatibility

- stored ordinary identities project in stable code-unit order with exact ID and condition labels;
- an accessible destructive confirmation names the exact identity and explains that destruction is
  permanent and does not restore aggregate stock;
- successful commands emit one strict `equipment.instance_destroyed` event with week, identity,
  canonical definition snapshot, condition, and the fixed `manual_disposal` reason;
- event validation rejects unsafe IDs, unknown or mismatched definitions, Combat Stims, unsupported
  reasons, and extra fields;
- event hydration preserves valid destruction history while the absent registry identity remains
  absent; no tombstone is persisted;
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event schema version remain unchanged.

## Deferred

| Item or mechanic                              | Owner or prerequisite | Reason                                                            |
| --------------------------------------------- | --------------------- | ----------------------------------------------------------------- |
| Damage production, repair, and re-aggregation | SPE-877 / child       | Condition lifecycle remains separately owned                      |
| Automatic loss or mission consequences        | SPE-2827 child        | Requires explicit lifecycle triggers and consequence ownership    |
| Custody restrictions                          | SPE-1055              | Custody and protected-item authority remains deferred             |
| Readiness or live access state                | SPE-1658              | Ready-versus-stored semantics remain outside registry destruction |
| Combat Stim disposal                          | SPE-2827 child        | Resource-bearing disposal requires specialized dose policy        |
| Generic payload destruction                   | SPE-2827 child        | Resource-specific destruction and outputs need separate authority |
| Recovery balance or automated selection       | SPE-1055 / SPE-2749   | This command neither recovers materials nor selects automatically |

## Validation

- exact successful destruction, immutable condition/definition snapshot, unchanged aggregate,
  damaged, fabricated, recovery, loadout, and material authorities, and stale replay idempotence;
- fail-closed unsafe, missing, equipped, Combat Stim, payload-bearing, active-claim, and
  completed-claim paths;
- strict producer, payload-schema, source-system, coverage, hydration, and save round-trip tests;
- stable exact-identity projection, condition labels, payload/claim blockers, and accessible
  destructive confirmation;
- focused equipment/event/hydration/UI tests, lint, repository verifiers, formatting, diff check,
  and the full Vitest suite.
