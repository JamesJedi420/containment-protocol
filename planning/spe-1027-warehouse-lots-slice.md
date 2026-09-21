# SPE-2979 — Authored warehouse lot identity distinct from stockpile qty

| Field               | Value                                                                                                                                                                                                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                                                                                                                                                                             |
| **Linear**          | [SPE-2979](https://linear.app/spectranoir/issue/SPE-2979/authored-warehouse-lot-identity-distinct-from-stockpile-qty)                                                                                                                                                                                                            |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog**                                                                                                                                                                                            |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                                                                                                                                                                                                |
| **Related**         | [SPE-2887](https://linear.app/spectranoir/issue/SPE-2887) qty consume inspect-only; [SPE-2935](https://linear.app/spectranoir/issue/SPE-2935) hauling inspect-only; do not reuse [SPE-2846](https://linear.app/spectranoir/issue/SPE-2846) / [SPE-2849](https://linear.app/spectranoir/issue/SPE-2849) `fabricatedEquipmentLots` |
| **Branch**          | `cursor/spe-1027-warehouse-lots-5e10`                                                                                                                                                                                                                                                                                            |
| **Base `main` SHA** | `30cd89afe76061ee8dff1c8d98141a44c54d8011`                                                                                                                                                                                                                                                                                       |

## Pre-coding summary

**Status on `main`:** not implemented. `facilityWarehouseLots` is absent from `src/` and
`SCHEMA_REGISTRY.md`. AC1–AC9 + SPE-2934 quarantine + SPE-2935 hauling shipped; leftover
warehouse starts with lot identity distinct from qty.

**Relevant files:** `src/domain/facilityHaulingLabor.ts` +
`src/test/facilityHaulingLabor.contract.test.ts` (optional-map pattern, inspect-only);
`src/domain/facilityStockpile.ts` (qty — do not mix lot identity into it);
`src/domain/facilityStockQuarantine.ts`; `src/app/store/runTransfer.ts` (hydrate +
`stripUndefinedFields`); `src/domain/models.ts`; `SCHEMA_REGISTRY.md`; `planning/backlog.md` +
`planning/backlog-handoff-manifest.json`. Equipment fabricated-lot registry in
`runTransfer.ts` / `SCHEMA_REGISTRY.md` is inspect-only.

**Current behavior:** warehouse stock has qty (`facilityStockpile`) and hauling labor, but no
authored lot identity. Omit is indistinguishable from a default lot. Qty can be mistaken for
lot.

**Expected behavior:** one authored `warehouse_sample` persists compact lot `lot_a`.
Omit/absent resolve is `identity: 'unknown'`, not a default lot and not derived from qty.
Matching present lot resolves `identity: 'present'`. Invalid/inherited/hidden stock or lot
fail-closes with the original state reference. Save/load preserves valid snapshots; malformed
siblings drop independently. Qty debit does not stamp or clear lot identity.

**Boundary:** leftover SPE-1027 warehouse lot identity only. New optional `GameState` sibling
map. No typed overflow/loss, misfile events, capacity-as-warehouse, UI, events, week-close,
seed, version bump, SPE-1456 carrier/route, recode SPE-2935 hauling / SPE-2887 consume /
SPE-2934 quarantine, or reuse SPE-2846 / SPE-2849 equipment fabricated lots.

**Risks:** treating omit as a default lot; hydration fallback inheritance; mixing this map into
stockpile qty, hauling, overflow, placement, quarantine, or secured-node maps; conflating with
equipment fabricated lots; shipping overflow/misfile/capacity in the same child; closing
SPE-1027 because AC1–AC9 + quarantine + hauling are Done.

**Validation:** `src/test/facilityWarehouseLots.contract.test.ts`, then SPE-2935 hauling /
SPE-2887 consume / SPE-2934 quarantine tests, lint, backlog-handoff, format,
`git diff --check`.

**Docs:** this slice doc, `SCHEMA_REGISTRY.md`, `planning/backlog.md`,
`planning/backlog-handoff-manifest.json`.

## Boundary

Ship one authored warehouse lot identity so qty is not the same as lot.

Reuse the optional-map parse/hydrate pattern from `facilityHaulingLabor` /
`facilityStockQuarantine` / `facilitySecuredNodes` / `facilityRestrictedObjectRelease` /
`facilityProtectionGoods`. Do not recode SPE-2887 `consumeFacilityStock`, SPE-2870 blast-door
repair, SPE-2890 `handleAccessControlledStock`, SPE-2891 `applyIncorrectStorageSpoilage`,
SPE-2892 caches, SPE-2895 overflow, SPE-2896 preparedness, SPE-2897 protection goods,
SPE-2911 restricted-object release, SPE-2933 secured nodes, SPE-2934 quarantine, or SPE-2935
hauling. Do not mix this map into spare-part quantity, hauling labor, placement,
condition/spoilage, caches, overflow, preparedness, protection goods, restricted-object
release, secured-node maps, or quarantine isolation. Do not debit or gate `facilityStockpile`
or catalog `GameState.inventory`. Do not reuse `fabricatedEquipmentLots`. Do not add player UI,
production starting-state seed, week-close automation, events, SPE-1042 vault architecture,
SPE-1046 clearance, SPE-867 evidence chain-of-custody, SPE-1456 logistics-flow, SPE-1621
seal-opening hazard, SPE-1314 policy umbrella, typed overflow/loss, misfile events,
capacity-as-warehouse, or version bumps. Do not close SPE-1027, SPE-1052, or SPE-877. Do not
pick SPE-62 / SPE-2217 / SPE-2847 / SPE-73 / SPE-40.

## Seam

`GameState.facilityWarehouseLots` is an optional map of authored warehouse stock ids
(`warehouse_sample`) to compact lot ids (`lot_a`). `parseFacilityWarehouseLots` hydrates
through `runTransfer`: omit / non-record / empty after sanitize → undefined. Only own
enumerable authored string-key entries participate; inherited, non-enumerable, symbol,
unknown, integer-index, prototype-unsafe, qty-shaped, and invalid-lot siblings drop
independently. Valid entries are rebuilt in authored stock-id order, and domain parser/writer
snapshots are frozen.

`stampFacilityWarehouseLot(state, { stockId, lot })` is caller-owned and accepts only an own
enumerable authored stock id plus authored lot. Unknown, malformed, missing, inherited, or
non-enumerable stock ids → `invalid_stock` with the original state reference. Unknown,
malformed, missing, inherited, non-enumerable, or qty-shaped lots → `invalid_lot`. Success
immutably stamps `warehouse_sample` → `lot_a`; repeated identical writes are idempotent in
meaning.

`resolveFacilityWarehouseLot(state, { stockId, lot })` is read-only and applies the same
fail-closed stock-id and lot validation. Unknown or malformed stock id → `invalid_stock`.
Unknown or malformed lot → `invalid_lot`. Omitted or absent stock lot resolves
`identity: 'unknown'` (not a default lot and not derived from qty). Matching present lot
resolves `identity: 'present'`. Empty/omit is not a default lot. Resolve returns the same
state reference and does not stamp. Hydration does not replay stamp or resolve, and omitted
persisted input does not inherit lots from the hydration fallback.

## Deferred

| Item or mechanic                   | Owner or prerequisite                                                                                                 | Why deferred                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Typed overflow / real loss         | [SPE-2980](https://linear.app/spectranoir/issue/SPE-2980/authored-typed-overflow-forced-triage-or-real-loss)          | Forced triage and loss are a later warehouse slice                            |
| Misfile events                     | later SPE-1027 child                                                                                                  | SPE-2890 already covers wrong-zone; remaining mismatch AC is not this lot map |
| Qty-vs-capacity warehouse          | later SPE-1027 child                                                                                                  | Live capacity is not this authored lot identity                               |
| Parent targeted tests for mismatch | later SPE-1027 children                                                                                               | Parent AC language remains open                                               |
| Personnel clearance                | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)                                                             | Do not create a parallel clearance system                                     |
| Evidence chain-of-custody          | [SPE-867](https://linear.app/spectranoir/issue/SPE-867)                                                               | Lot stamp only                                                                |
| Vault security                     | [SPE-1042](https://linear.app/spectranoir/issue/SPE-1042)                                                             | Not a vault-architecture implementation                                       |
| Seal-opening hazard release        | [SPE-1621](https://linear.app/spectranoir/issue/SPE-1621)                                                             | Lot stamp, not seal breach                                                    |
| Logistics-flow layer               | [SPE-1456](https://linear.app/spectranoir/issue/SPE-1456)                                                             | No carrier/route simulator                                                    |
| Low-grade anomaly storage policy   | [SPE-1314](https://linear.app/spectranoir/issue/SPE-1314)                                                             | One concrete stock, not the policy umbrella                                   |
| Equipment fabricated lots          | [SPE-2846](https://linear.app/spectranoir/issue/SPE-2846) / [SPE-2849](https://linear.app/spectranoir/issue/SPE-2849) | Inspect-only; do not reuse as warehouse lots                                  |
| Player command / UI                | later SPE-1027 / topology UI child                                                                                    | Domain helper only this slice                                                 |
| Production starting-state seed     | later SPE-1027 child                                                                                                  | Match the unseeded optional facility-map pattern                              |
| Week-close automation and events   | later integration child                                                                                               | Caller-owned helper and persisted map only                                    |

## Acceptance

- Stamp complete `warehouse_sample` + `lot_a` and resolve matching lot → `ok`; `identity: 'present'`
- Omitted or absent stock lot resolve → `ok`; `identity: 'unknown'`, not a default lot and not derived from qty
- Unknown, raw, missing, inherited, or non-enumerable stock id → `invalid_stock`; original state reference returned
- Unknown, raw, missing, inherited, non-enumerable, or qty-shaped lot → `invalid_lot`; original state reference returned
- Stamp is immutable and idempotent in meaning; parser/writer snapshots are frozen; resolve is read-only
- Hydration accepts only own enumerable valid authored siblings, drops malformed siblings independently, and does not inherit omitted fallback lots
- Save/load preserves a valid snapshot without replaying stamp
- Unrelated facility state including `facilityStockpile`, `facilityHaulingLabor`, `facilityStockQuarantine`, `facilityEmergencyCaches`, `facilityStockOverflow`, `facilityStockPlacement`, `facilitySecuredNodes`, and `fabricatedEquipmentLots` is preserved and `consumeFacilityStock` remains unchanged and ungated
- SPE-2935 hauling, SPE-2887 consume, and SPE-2934 quarantine remain regression-clean and are not recoded
- Parent SPE-1027 remains Backlog; SPE-1052 remains Backlog; SPE-877 remains Backlog; GitHub #1036 stays OPEN

## Validation

- `npm run test:run -- src/test/facilityWarehouseLots.contract.test.ts`
- `npm run test:run -- src/test/facilityHaulingLabor.contract.test.ts`
- `npm run test:run -- src/test/facilityStockpile.contract.test.ts`
- `npm run test:run -- src/test/facilityStockQuarantine.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run format:check`
- `git diff --check`
