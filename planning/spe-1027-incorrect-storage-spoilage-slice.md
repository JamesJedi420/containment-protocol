# SPE-2891 — Incorrect-storage degrade and nearby contamination

| Field               | Value                                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                       |
| **Linear**          | [SPE-2891](https://linear.app/spectranoir/issue/SPE-2891/incorrect-storage-degrade-and-nearby-contamination-for-one-perishable)                            |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog**                      |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                          |
| **Related**         | [SPE-2890](https://linear.app/spectranoir/issue/SPE-2890/access-controlled-storage-class-clearance-and-wrong-zone-handle) (placement handle stays ungated) |
| **Branch**          | `cursor/spe-1027-incorrect-storage-spoilage-3400`                                                                                                          |
| **Base `main` SHA** | `bb94407387b669905c7c72ed23a964c349d5c0bc`                                                                                                                 |

## Boundary

Ship one authored perishable stock type so SPE-1027’s third AC is true: storing
`cold_storage_reagent` in `mundane_supplies` degrades it and contaminates nearby mundane stock;
storing it in `cold_storage` stamps `intact` without clearing an existing neighbor
`contaminated` stamp.

Reuse the optional-map parse/hydrate pattern from `facilityStockpile` / `facilityStockPlacement`.
Do not recode SPE-2775, SPE-2887 `consumeFacilityStock`, SPE-2870 blast-door repair, or SPE-2890
`handleAccessControlledStock`. Do not add `cold_storage` to SPE-2890 `STORAGE_ZONE_IDS`. Do not
mix condition into spare-part qty or placement. Do not implement quarantine, hauling, capacity,
lots, emergency caches, SPE-1026 CAD, player UI, week-close auto-spoil, or production
starting-state seed. Do not invent catalog `GameState.inventory` as this port. Do not bump
`GAME_STORE_VERSION`. Do not close SPE-1027, SPE-1052, or SPE-877. Do not reopen SPE-2827 /
SPE-2848. Do not pick SPE-2847.

## Seam

`GameState.facilityStockCondition` is an optional map of known spoilage stock ids
(`cold_storage_reagent`, `mundane_supplies`) to `intact` / `degraded` / `contaminated`.
`parseFacilityStockCondition` hydrates through `runTransfer`: omit / non-record / empty after
sanitize → undefined; unknown, integer-index, prototype-unsafe, and non-enum siblings drop
independently.

`applyIncorrectStorageSpoilage(state, { stockId, storedZone })` is caller-owned. Unknown or
neighbor-as-primary stock → `invalid_stock`. Zone other than `cold_storage` or `mundane_supplies`
→ `invalid_zone`. Allowed zone stamps reagent `intact` and leaves neighbor unchanged. Incorrect
zone stamps reagent `degraded` and neighbor `contaminated`. Catalog inventory, `facilityStockpile`,
and `facilityStockPlacement` are unchanged. Hydration does not re-run apply.

## Deferred

| Item or mechanic                            | Owner or prerequisite                                                                                             | Why deferred                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| SPE-1026 topology-to-staging / zone CAD     | [SPE-1026](https://linear.app/spectranoir/issue/SPE-1026/facility-layout-strategy-and-zone-adjacency-model)       | Layout graph, not this spoilage helper                                |
| Player command / UI to store stock          | later SPE-1027 / topology UI child                                                                                | Domain helper only this slice                                         |
| Production starting-state seed of condition | later SPE-1027 child                                                                                              | Match SPE-2887 / SPE-2889 / SPE-2890 no production seed               |
| Neighbor correction / decontamination       | later SPE-1027 child                                                                                              | This slice preserves mistaken neighbor `contaminated` on later intact |
| Remaining SPE-1027 warehouse AC             | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) | Quarantine, hauling, capacity, lots, caches                           |
| SPE-877 parent reconciliation               | explicit SPE-877 parent-reconciliation slice                                                                      | Do not close SPE-877                                                  |

## Acceptance

- `cold_storage_reagent` + `cold_storage` → `ok`; reagent `intact`; neighbor omitted; catalog inventory and `facilityStockpile` unchanged
- `cold_storage_reagent` + `mundane_supplies` → `ok`; reagent `degraded` and neighbor `contaminated`
- Neighbor-as-primary or unknown stock → `invalid_stock`; no condition write
- Unknown zone → `invalid_zone`; no condition write
- Pre-existing neighbor `contaminated` survives a later correct-zone stamp of the reagent
- Hydration/save-load does not re-run apply or debit stock
- Spare-part consume stays ungated when condition is omitted
- Parent SPE-1027 remains Backlog; SPE-1052 remains Backlog; SPE-877 remains Backlog

## Validation

- Targeted Vitest: `src/test/facilityStockSpoilage.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
