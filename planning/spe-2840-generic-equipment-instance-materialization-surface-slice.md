# SPE-2840 — Generic Ordinary-Equipment Instance Materialization and Assignment Surface

| Field      | Value                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped**                                                                                                         |
| **Linear** | [SPE-2840](https://linear.app/spectranoir/issue/SPE-2840/generic-ordinary-equipment-instance-materialization-and-assignment) |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)                      |
| **Branch** | `jamesdyedbq/spe-2840-generic-equipment-instance-surface`                                                                    |

## Boundary

This slice makes the shipped ordinary-equipment instance authority player-reachable outside the
specialized Combat Stim path. An explicit command converts exactly one aggregate, non-Combat-Stim
equipment unit into one operational stored instance. The command reuses the canonical instance-ID,
inventory, damaged-stock ambiguity, and persistence contracts and emits the existing
`equipment.instance_materialized` event with stored-location provenance.

The Equipment page shows aggregate, stored-instance, and equipped-instance counts separately.
Materialization requires explicit confirmation. Generic stored instances appear as exact compatible
loadout choices and move through the existing idle-agent, allowed-slot, occupied-slot, compatibility
projection, transfer, and unequip contracts without aggregate inventory credit.

## Determinism and compatibility

- stored instances are projected in stable code-unit instance-ID order;
- invalid, unknown, Combat Stim, unavailable-stock, damaged-stock-ambiguity, stale-instance,
  incompatible-slot, and non-idle assignment attempts fail closed;
- replacement of a legacy definition-only loadout returns that legacy unit to aggregate stock before
  assigning the exact stored instance;
- instance-backed transfer and unequip preserve identity and never change aggregate stock;
- legacy saves continue to hydrate an empty optional registry and no game, save, store, or event
  schema version changes are required;
- Combat Stim payload creation, activation, recovery, and dose-aware UI behavior remain specialized
  and unchanged.

## Deferred

| Item or mechanic                          | Owner or prerequisite | Reason                                                        |
| ----------------------------------------- | --------------------- | ------------------------------------------------------------- |
| Payload authoring and generic consumption | SPE-2827 children     | Requires resource-specific authority                          |
| Condition mutation and damage producers   | SPE-877 / child       | Maintenance and integrity mechanics remain separately owned   |
| Repair, loss, and destruction             | SPE-2827 children     | Require explicit lifecycle commands and durable consequences  |
| Instance-aware salvage and Auto-Scrap     | SPE-1055 / SPE-2749   | Destructive selection requires recovery and protection policy |
| Custody, contamination, and authorization | SPE-1027 / SPE-1055   | Equipment-linked restriction state is not yet authoritative   |
| Readiness and access state                | SPE-1658              | Ready-versus-stowed semantics are outside identity assignment |

## Validation

- guarded ordinary materialization, stable IDs, one aggregate decrement, immutable snapshots, and
  existing event payload production;
- deterministic stored-instance listing and definition filtering;
- exact generic assignment, legacy replacement credit, transfer, and unequip identity preservation;
- stale, incompatible, occupied, malformed, and non-idle fail-closed paths;
- projection separation for aggregate, stored, and equipped quantities;
- accessible confirmation and exact-instance loadout controls;
- Combat Stim, recovery, Auto-Scrap, hydration, and save/load regression coverage;
- targeted tests, lint, repository verifiers, formatting, diff check, and full CI-mode tests.
