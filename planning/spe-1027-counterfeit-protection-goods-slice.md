# SPE-2897 — Counterfeit respirator filter causes safety failure and false reassurance (parent AC7)

| Field               | Value                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                              |
| **Linear**          | [SPE-2897](https://linear.app/spectranoir/issue/SPE-2897/counterfeit-respirator-filter-causes-safety-failure-and-false)                           |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog**             |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                 |
| **Related**         | [SPE-2896](https://linear.app/spectranoir/issue/SPE-2896) — inspect only; preparedness and stockout pressure are not protection-good authenticity |
| **Branch**          | `cursor/spe-1027-counterfeit-protection-goods-3400`                                                                                               |
| **Base `main` SHA** | `e5616a72` (rebase onto post-#3672 `main`)                                                                                                         |

## Boundary

Ship one authored protection good so SPE-1027’s seventh AC is true: a `respirator_filter` can be
present as a recognized item yet be `counterfeit`, causing direct protection failure while giving
false reassurance. Persist only the compact authored status needed to resolve that outcome.

Reuse the optional-map parse/hydrate pattern from `facilityStockPreparedness` and its facility
siblings. Do not recode SPE-2887 `consumeFacilityStock`, SPE-2870 blast-door repair, SPE-2890
`handleAccessControlledStock`, SPE-2891 `applyIncorrectStorageSpoilage`, SPE-2892 cache helpers,
SPE-2895 overflow helpers, or SPE-2896 preparedness helpers. Do not mix protection goods into
spare-part quantity, placement, condition/spoilage, caches, overflow, or preparedness. Do not
debit or gate `facilityStockpile` or catalog `GameState.inventory`. Do not add trust damage,
SPE-565 appraisal/verification, protective-gear mitigation, restricted-object release,
secured-node threat, quarantine, hauling, lots, capacity-as-warehouse, player UI, production
starting-state seed, week-close automation, events, or version bumps. Do not close SPE-1027,
SPE-1052, or SPE-877.

## Seam

`GameState.facilityProtectionGoods` is an optional map of authored protection-good ids
(`respirator_filter`) to the sole persisted status `counterfeit`. `parseFacilityProtectionGoods`
hydrates through `runTransfer`: omit / non-record / empty after sanitize → undefined. Only own
enumerable authored string-key entries participate; inherited, non-enumerable, symbol, unknown,
integer-index, prototype-unsafe, and invalid-status siblings drop independently. Valid entries are
rebuilt in authored order, and domain parser/writer snapshots are frozen.

`recordCounterfeitProtectionGood(state, { itemId })` is caller-owned and accepts only an own
enumerable authored item id. Unknown, malformed, missing, inherited, or non-enumerable item ids →
`invalid_item` with the original state reference. Success immutably stamps
`respirator_filter` → `counterfeit`; repeated writes are idempotent in meaning. Catalog inventory,
`facilityStockpile`, and all sibling facility maps are unchanged.

`resolveFacilityProtectionGoodOutcome(state, { itemId })` is read-only and applies the same
fail-closed item-id validation. Unknown or malformed item id → `invalid_item`. Omitted or absent
protection-good state resolves `protection: 'unknown'` and `assurance: 'unknown'`. A persisted
`counterfeit` respirator filter resolves `protection: 'failed'`,
`assurance: 'false_reassurance'`, and returns the persisted status. Resolve returns the same state
reference and does not stamp an outcome. Hydration does not replay record or resolve, and omitted
persisted input does not inherit protection goods from the hydration fallback.

## Deferred

| Item or mechanic                           | Owner or prerequisite                                                        | Why deferred                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Trust / reputation damage                  | later consequence child                                                      | This slice records direct protection truth only                |
| Appraisal / authenticity verification      | [SPE-565](https://linear.app/spectranoir/issue/SPE-565) or a dedicated child | No detection, reveal, or verification loop in this slice       |
| Protective-gear mitigation                 | later equipment / incident child                                             | Counterfeit outcome is not wired into broader gear resolution  |
| Restricted-object release                  | next SPE-1027 child                                                          | Next parent acceptance seam after counterfeit protection goods |
| Secured-node threat                        | later SPE-1027 child                                                         | Separate threat and security contract                          |
| Quarantine, hauling, capacity, and lots    | later SPE-1027 children                                                      | Broader warehouse operations remain outside AC7                |
| Player command / UI                        | later SPE-1027 / topology UI child                                           | Domain helper only this slice                                  |
| Production starting-state seed             | later SPE-1027 child                                                         | Match the unseeded optional facility-map pattern               |
| Week-close automation and operation events | later integration child                                                      | Caller-owned helper and persisted map only                     |
| SPE-877 parent reconciliation              | explicit SPE-877 parent-reconciliation slice                                 | Do not close SPE-877                                           |

## Acceptance

- Record a valid `respirator_filter` counterfeit and resolve → `ok`; `protection: 'failed'`; `assurance: 'false_reassurance'`; persisted `status: 'counterfeit'`
- Omitted or absent protection-good state resolves → `ok`; `protection: 'unknown'`; `assurance: 'unknown'`
- Unknown, raw, missing, inherited, or non-enumerable item id on record or resolve → `invalid_item`; original state reference returned
- Record is immutable and idempotent in meaning; parser/writer snapshots are frozen; resolve is read-only
- Hydration accepts only own enumerable valid authored siblings, drops malformed siblings independently, and does not inherit omitted fallback protection goods
- Save/load preserves a valid status without replaying a command or outcome
- Unrelated facility state is preserved and `consumeFacilityStock` remains unchanged and ungated
- Parent SPE-1027 remains Backlog; SPE-1052 remains Backlog; SPE-877 remains Backlog

## Validation

- `npm run test:run -- src/test/facilityProtectionGoods.contract.test.ts`
- `npm run test:run -- src/test/sim.validation.test.ts`
- `npm run test:run`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run format:check`
- `git diff --check`
