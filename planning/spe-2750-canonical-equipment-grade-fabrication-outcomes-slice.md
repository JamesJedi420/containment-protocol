# SPE-2750 — Canonical Equipment-Grade Fabrication Outcomes

| Field       | Value                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| **Status**  | **Shipped**                                                                                              |
| **Linear**  | [SPE-2750](https://linear.app/spectranoir/issue/SPE-2750/canonical-equipment-grade-fabrication-outcomes) |
| **Parent**  | [SPE-612](https://linear.app/spectranoir/issue/SPE-612/workshop-scale-crafting-support)                  |
| **Program** | [SPE-2746](https://linear.app/spectranoir/issue/SPE-2746/canonical-equipment-grade-taxonomy)             |
| **Branch**  | `jamesdyedbq/spe-2750-canonical-equipment-grade-fabrication-outcomes`                                    |

## Boundary

The seven live Fabrication recipes now author deterministic output-grade rules that consume the
SPE-2798 registry and SPE-2751 catalog participation. Queue entries snapshot the resolved grade,
visibility, and explanation; completion credits the unchanged aggregate inventory and records one
durable grade-bearing fabrication lot keyed by queue ID.

Recipe cost, duration, quantity, material consumption, item stats, rarity, legacy effect scale,
provider reliability, defects, condition, and workshop completion quality remain unchanged.

## Rule contract

| Rule kind         | Resolution                                                      |
| ----------------- | --------------------------------------------------------------- |
| `fixed`           | Exact authored grade, required to match the output definition   |
| `catalog`         | Output definition's canonical grade                             |
| `bounded_catalog` | Catalog grade accepted only inside the authored inclusive range |
| `minimum_catalog` | Catalog grade accepted only at or above the authored minimum    |

Rules contain canonical IDs only. Strict validation rejects unknown kinds and IDs, missing or
unexpected fields, reversed ranges, ungraded outputs, fixed/catalog mismatches, and catalog grades
outside authored constraints. Invalid recipes are unavailable rather than silently defaulting.

## Live recipe assignments

| Recipe              | Rule              | Result   |
| ------------------- | ----------------- | -------- |
| `ward-seals`        | `fixed`           | Grade I  |
| `med-kits`          | `catalog`         | Grade I  |
| `silver-rounds`     | `minimum_catalog` | Grade I  |
| `signal-jammers`    | `bounded_catalog` | Grade II |
| `emf-sensors`       | `catalog`         | Grade II |
| `warding-kits`      | `bounded_catalog` | Grade II |
| `ritual-components` | `fixed`           | Grade I  |

These paths cover ordinary, magical, technological, and hybrid catalog origins without defining a
second scale. Preview and active-queue UI use the canonical projection; hidden outcomes expose only
`Grade unknown` and generic explanation text.

## SPE-612 terminology reconciliation

The live production and workshop models contain no consumable-kit `qualityTier` field or parallel
item-quality scale. `outputQuantity` remains a unit count, while department-workshop completion
`quality` remains a separate process-result condition and cannot alter baseline equipment grade.
No legacy field therefore requires retention, renaming, or migration in this slice.

## Persistence and compatibility

`ProductionQueueEntry` snapshots `outputGradeId`, visibility, and stable explanation codes.
`GameState.fabricatedEquipmentLots` stores completed batch identity, item, quantity, canonical grade,
and completion week while `GameState.inventory` remains the quantity authority. Completion is
idempotent when a lot already exists for the queue ID.

Legacy queues with no grade fields are deterministically backfilled from the validated recipe and
catalog definition. Partially present or malformed snapshots fail closed. Legacy saves default the
lot registry to `{}`; malformed lot siblings are dropped independently in code-unit key order.
Production start/completion events carry the snapshotted canonical grade contract. These optional
field additions do not change `GAME_STORE_VERSION` or `GAME_SAVE_VERSION`.

## Deferred

| Item                                              | Owner                     | Boundary                                                              |
| ------------------------------------------------- | ------------------------- | --------------------------------------------------------------------- |
| Grade-driven deconstruction and recovery          | SPE-2748                  | Consume canonical lots without deriving grade from condition or value |
| Grade-threshold Auto-Scrap routing                | SPE-2749                  | Preserve hidden-grade opacity and deterministic lot selection         |
| Per-copy selection, sale, and loadout consumption | create child              | Aggregate inventory remains quantity authority in this slice          |
| Material-quality grade influence                  | SPE-1056                  | Requires canonical processed material batches, not quantity inference |
| Specialist/provider/workspace grade influence     | SPE-1058/SPE-141/SPE-1028 | Requires explicit owner-supplied capability contracts                 |
