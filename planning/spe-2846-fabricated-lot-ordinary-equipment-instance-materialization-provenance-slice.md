# SPE-2846 — Fabricated-Lot Ordinary-Equipment Instance Materialization Provenance

| Field      | Value                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped**                                                                                              |
| **Linear** | [SPE-2846](https://linear.app/spectranoir/issue/SPE-2846/fabricated-lot-ordinary-equipment-instance-materialization-provenance) |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority)                           |
| **Branch** | `jamesdyedbq/spe-2846-fabricated-lot-equipment-instance-provenance`                                                              |

## Boundary

This slice materializes one exact ordinary-equipment identity from a selected fabricated lot while
retaining the lot's canonical grade provenance. The player selects catalog stock or one safe
outstanding fabricated lot whose definition matches. Success atomically decrements aggregate
inventory and increments that lot's `trackedInstanceUnits` (production `quantity` stays the immutable
SPE-2800 receipt), and creates one stored operational payload-free non-Combat identity with an
optional nested fabrication-origin snapshot.

Catalog-created and legacy instances omit the snapshot. Assignment, transfer, unequip, save/load,
and events preserve provenance. Exact-instance recovery resolves grade from the retained snapshot
and remains ID-only (mutually exclusive with fabricated-lot recovery source fields). Permanent
destruction stays allowed without inventory credit. Generic catalog re-aggregation fails closed for
fabricated-origin identities until a provenance-preserving return command is authored separately.

Combat Stim, payload-bearing identities, exhausted/mismatched/unsafe lots, damaged-aggregate
ambiguity, and stale replay fail closed. Auto-Scrap remains aggregate-only.

## Determinism and compatibility

- materialization source projection reuses `resolveEquipmentDeconstructionSources` so recovery
  claims continue to reserve lot units; outstanding remaining is quantity − recovery claims −
  trackedInstanceUnits;
- fabrication-origin snapshots are immutable through relocate/CAS; hydration rejects partial,
  unsafe, unknown, lot-mismatched, or payload-bearing provenance while preserving valid siblings;
- successful lot materialization emits `equipment.instance_materialized` with an all-or-none
  fabrication snapshot that hydrates on save/load; catalog materialization omits those fields;
- exact-instance recovery may retain a fabricated grade distinct from catalog grade;
- `GAME_STORE_VERSION`, `GAME_SAVE_VERSION`, and the operation-event schema version remain unchanged
  unless hydration evidence requires otherwise.

## Deferred

| Item or mechanic                                         | Owner or prerequisite | Reason                                                              |
| -------------------------------------------------------- | --------------------- | ------------------------------------------------------------------- |
| Provenance-preserving fabricated-instance return-to-lot  | SPE-2827 child        | Generic re-aggregation must not erase grade provenance              |
| Fabricated Combat Stim or generic payload materialization| SPE-2827 child        | Specialized payload policy                                          |
| Automated lot or instance selection                      | SPE-2749 child        | Auto-Scrap remains aggregate-only                                   |
| Repair, damage production, custody, readiness, mission loss | SPE-877 / SPE-1055 / SPE-1658 | Broader lifecycle authorities                                 |
| Recovery balancing                                       | SPE-1055              | Outputs and thresholds stay separately owned                        |

## Validation

- lot materialization success (inventory −1, selected lot −1, retained snapshot) and exhaust fail-closed;
- mixed catalog/multiple-lot selection; Combat Stim / payload / damaged / mismatched fail-closed;
- assignment/transfer/unequip provenance preservation; origin mutation rejected;
- instance recovery uses retained grade without mixed source fields;
- destruction without credit; generic re-aggregation rejects fabricated-origin;
- hydration reject/accept and save round-trip; event strictness;
- UI provenance labels and re-aggregation blocker; catalog/Combat/Auto-Scrap regressions;
- focused tests, lint, repository verifiers, formatting, and full Vitest suite.
