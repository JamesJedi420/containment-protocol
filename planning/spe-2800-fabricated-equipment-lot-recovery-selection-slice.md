# SPE-2800 — Fabricated Equipment-Lot Recovery Selection

| Field      | Value                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped**                                                                                        |
| **Linear** | [SPE-2800](https://linear.app/spectranoir/issue/SPE-2800/fabricated-equipment-lot-recovery-selection)       |
| **Parent** | [SPE-1055](https://linear.app/spectranoir/issue/SPE-1055/salvage-recycling-and-anomalous-material-recovery) |
| **Branch** | `jamesdyedbq/spe-2800-fabricated-equipment-lot-recovery-selection`                                          |

## Boundary

Manual equipment recovery can select catalog/unspecified stock or one explicit completed
fabrication batch. Selection assigns one current aggregate stock unit to that source at queue time.
The recovery queue snapshots the lot ID and canonical lot grade; its immutable completion outcome
retains the same provenance. Fabrication lots remain immutable production receipts, while aggregate
inventory remains quantity authority.

The existing recovery queue plus completed outcomes form the durable lot-consumption ledger. No
parallel allocation registry, per-instance inventory model, fabrication rebalance, or save-version
change is introduced.

## Selection and automation contract

- Catalog-source quantity is stock beyond every outstanding fabricated-lot unit.
- A fabricated source must reference a matching, unclaimed lot and positive aggregate stock.
- Completed claims win hydration conflicts before active claims; siblings then resolve by week and
  queue ID, independently of serialized object or queue order.
- Missing provenance on legacy recovery records means catalog history because the pre-SPE-2800
  runtime prohibited fabricated-lot recovery.
- Grade visibility remains definition-owned. Hidden projections expose only `Grade unknown` and
  cannot enter recovery.
- Auto-Scrap never chooses batch provenance. An item remains excluded while any fabricated-lot
  unit is outstanding and becomes eligible again only after all batch units have explicit claims.

Existing item-level damage handling, recovery rules, materials, waste, duration, and condition
semantics remain unchanged.

## Persistence

Optional `sourceFabricationQueueId` fields on recovery queues, outcomes, and start/completion events
carry the selected production queue identity. Hydration rejects unsafe, missing, item-mismatched,
grade-mismatched, or over-capacity references rather than inventing catalog provenance. The fields
are optional and do not change `GAME_STORE_VERSION` or `GAME_SAVE_VERSION`.

## Deferred

Auto-Scrap selection of fabricated batches remains unsupported. Remaining recovery profiles stay
with SPE-1055; custody/evidence/legal authority state stays with SPE-1027/SPE-867; identification,
favorite, lock, quest, unique-copy, sale, loadout-by-lot, and generalized per-instance inventory
remain outside this slice.
