# SPE-2826 — Trauma Kit Recovery Profile

| Field      | Value                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped**                                                                                        |
| **Linear** | [SPE-2826](https://linear.app/spectranoir/issue/SPE-2826/trauma-kit-recovery-profile)                       |
| **Parent** | [SPE-1055](https://linear.app/spectranoir/issue/SPE-1055/salvage-recycling-and-anomalous-material-recovery) |
| **Branch** | `jamesdyedbq/spe-2826-trauma-kit-recovery-profile`                                                          |

## Boundary

This slice changes Trauma Kit from explicitly deferred to eligible by reusing the established
medical component-reclamation rule. The catalog Grade I outcome recovers one
`medical_supplies`, produces 1 waste, and takes one week. The existing Grade II threshold adds
one `medical_supplies` and reduces waste by one; it does not create a new grade or material axis.

Manual recovery, SPE-2800 catalog/fabricated-lot selection, queue snapshots, immutable outcomes,
events, SPE-2799 Auto-Scrap, and Equipment UI consume the expanded registry without new paths.
Aggregate inventory remains quantity authority, hidden grades remain unavailable, and the
existing independent damaged-condition waste adjustment remains unchanged.

This slice introduces no public API, persisted field, schema migration, spreadsheet authority,
or save/store version change.

## Deferred

| Item or mechanic                   | Owner or prerequisite  | Reason                                                                                      |
| ---------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| Combat Stims recovery              | SPE-1055 child         | Requires the authoritative consumable-depletion model before a stock unit can be dismantled |
| Seven other unauthored profiles    | SPE-1055 children      | Material, hybrid, magical, protection, or diplomatic authorities remain unresolved          |
| Repair, custody, and authorization | SPE-1055 prerequisites | Require equipment-linked state rather than recovery-owned flags                             |
| Contamination and relic outcomes   | SPE-1055 prerequisites | Require deterministic fallout and provenance-loss authorities                               |

## Validation

- exact fifteen-eligible/eight-deferred registry coverage and Trauma Kit rule authoring;
- Grade I material, waste, duration, queue snapshot, completion receipt, and event;
- grade independence from rarity, value, provenance, and legacy effect scale;
- preservation of the independent damage-to-waste adjustment and hidden-grade safety;
- Auto-Scrap inclusion with Combat Stims remaining recovery-unavailable;
- existing accessible Equipment UI preview, confirmation, and active-queue presentation;
- focused tests, lint, repository verifiers, formatting, diff check, and full CI-mode tests.
