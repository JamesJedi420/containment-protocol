# SPE-2841 — Stored Ordinary-Equipment Instance Recovery Selection

| Field      | Value                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped**                                                                                            |
| **Linear** | [SPE-2841](https://linear.app/spectranoir/issue/SPE-2841/stored-ordinary-equipment-instance-recovery-selection) |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)         |
| **Branch** | `jamesdyedbq/spe-2841-stored-ordinary-equipment-instance-recovery-selection`                                    |

## Boundary

This slice broadens eligible ordinary recovery profiles from aggregate-only authority to mixed
aggregate-and-instance authority. Manual recovery can select catalog stock, an authored fabricated
batch, or an exact safe stored ordinary instance through the existing recovery queue. Exact-instance
queueing removes only that identity, preserves aggregate and damaged aggregate inventory, snapshots
definition grade and condition, and emits ID-only instance provenance through the existing queue,
outcome, event, replay, and hydration contracts.

Combat Stim remains the sole instance-only profile and retains its canonical empty-dose and inactive
overdrive restrictions plus its complete resource snapshot. Auto-Scrap continues to route aggregate
catalog stock only and never selects stored identities.

## Determinism and compatibility

- ordinary instances project in stable code-unit identity order alongside catalog and fabricated
  sources, with condition-specific outcomes and labels that omit resource-dose text;
- eligible identities must be safe, stored, definition-matching, unclaimed, and payload-free;
- queueing an ordinary identity emits only `sourceEquipmentInstanceId`; Combat Stim continues to emit
  all instance/resource provenance fields;
- hydration accepts completed claims before active claims and rejects unsafe, malformed, partial,
  mixed, unsupported, grade-mismatched, foreign, or duplicate claims without invalidating siblings;
- accepted recovery claims win over conflicting live registry identities, preserving replay and
  save/load idempotence;
- aggregate and fabricated-lot recovery behavior remains unchanged, and no game, save, store, or
  event schema version changes are required.

## Deferred

| Item or mechanic                              | Owner or prerequisite | Reason                                                           |
| --------------------------------------------- | --------------------- | ---------------------------------------------------------------- |
| Generic payload recovery                      | SPE-2827 child        | Resource-specific validation and recovery outputs need ownership |
| Damage production, repair, and re-aggregation | SPE-877 / child       | Condition lifecycle remains separately owned                     |
| Generic loss, destruction, and custody rules  | SPE-2827 / SPE-1055   | Requires explicit lifecycle and restriction authorities          |
| Readiness or live access state                | SPE-1658              | Ready-versus-stored semantics remain outside recovery identity   |
| Automated exact-instance selection            | SPE-2749 child        | Auto-Scrap remains intentionally aggregate-only                  |
| Recovery balancing and new outputs            | SPE-1055              | This slice reuses existing grade/condition outcomes              |

## Validation

- simultaneous catalog, fabricated-batch, and multiple stored-instance projection;
- exact ordinary queueing, identity removal, unchanged aggregate state, immutable snapshots,
  completion, event replay, and save/load behavior;
- fail-closed equipped, unsafe, missing, payload-bearing, foreign-definition, duplicate-claimed,
  deferred-profile, malformed, partial-resource, and mixed-provenance paths;
- Combat Stim empty-dose restrictions and complete resource provenance regression coverage;
- accessible source labels and destructive confirmation for ordinary and Combat Stim instances;
- aggregate-only Auto-Scrap, aggregate recovery, and fabricated-lot recovery regressions;
- focused recovery/event/hydration/UI tests, lint, repository verifiers, formatting, diff check, and
  the full Vitest suite.
