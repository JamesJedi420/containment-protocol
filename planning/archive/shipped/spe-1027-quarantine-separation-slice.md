# SPE-2934 — Authored cursed-object quarantine keeps contaminated stock separate from clean inventory

| Field               | Value                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                  |
| **Linear**          | [SPE-2934](https://linear.app/spectranoir/issue/SPE-2934/authored-cursed-object-quarantine-keeps-contaminated-stock-separate)         |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog** |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**     |
| **Related**         | [SPE-2891](https://linear.app/spectranoir/issue/SPE-2891) — inspect only; do not recode spoilage contamination                        |
| **Branch**          | `cursor/spe-1027-quarantine-separation-3c0c`                                                                                          |
| **Base `main` SHA** | `6e8e485f641e8d6472f9a1c4c9894c97ccd0145d`                                                                                            |

## Pre-coding summary

**Status on `main`:** not implemented. `facilityStockQuarantine` is absent from `src/` and
`SCHEMA_REGISTRY.md`. AC1–AC9 children shipped; leftover warehouse starts with quarantine.

**Relevant files:** `src/domain/facilitySecuredNodes.ts` +
`src/test/facilitySecuredNodes.contract.test.ts` (optional-map pattern);
`src/domain/facilityStockSpoilage.ts` (SPE-2891 inspect-only neighbor);
`src/domain/facilityStockOverflow.ts`; `src/domain/facilityStockAccess.ts`;
`src/app/store/runTransfer.ts` (hydrate + `stripUndefinedFields`); `src/domain/models.ts`;
`SCHEMA_REGISTRY.md`; `planning/backlog.md` + `planning/backlog-handoff-manifest.json`.

**Current behavior:** contaminated vs clean inventory has no authored quarantine node. SPE-2891
`facilityStockCondition` stamps perishable degrade/nearby contamination and is not a quarantine
map. Omit, quarantined, clean, and mixed routing are not distinguishable.

**Expected behavior:** one authored `cursed_object_quarantine` persists compact isolation
`quarantined` | `clean`. Omit/absent resolve is `unknown`, not mixed and not clean. Matching
isolation resolves `separated`. Opposite isolation fail-closes `mix_mismatch`. Invalid/inherited/
hidden node or isolation fail-closes with the original state reference. Save/load preserves valid
snapshots; malformed siblings drop independently.

**Boundary:** leftover SPE-1027 quarantine only. New optional `GameState` sibling map. No hauling,
lots, typed overflow/loss, capacity-as-warehouse, UI, events, week-close, seed, version bump, or
SPE-2891 recode.

**Risks:** treating omit as mixed/clean; hydration fallback inheritance; mixing this map into
stockpile qty, overflow, placement, or secured-node maps; shipping extra warehouse children;
closing SPE-1027 because AC1–AC9 are Done.

**Validation:** `src/test/facilityStockQuarantine.contract.test.ts`, then SPE-2891 / SPE-2887
consume tests, lint, backlog-handoff, format, `git diff --check`.

**Docs:** this slice doc, `SCHEMA_REGISTRY.md`, `planning/backlog.md`,
`planning/backlog-handoff-manifest.json`. Drop the stale current-handoff clause that says SPE-2217
is shipping this session.

## Boundary

Ship one authored quarantine node so contaminated items stay distinct from clean inventory and
mixing is a typed fail-closed mismatch.

Reuse the optional-map parse/hydrate pattern from `facilitySecuredNodes` /
`facilityRestrictedObjectRelease` / `facilityProtectionGoods`. Do not recode SPE-2887
`consumeFacilityStock`, SPE-2870 blast-door repair, SPE-2890 `handleAccessControlledStock`,
SPE-2891 `applyIncorrectStorageSpoilage`, SPE-2892 caches, SPE-2895 overflow, SPE-2896
preparedness, SPE-2897 protection goods, SPE-2911 restricted-object release, or SPE-2933 secured
nodes. Do not mix this map into spare-part quantity, placement, condition/spoilage, caches,
overflow, preparedness, protection goods, restricted-object release, or secured-node maps. Do not
debit or gate `facilityStockpile` or catalog `GameState.inventory`. Do not add player UI,
production starting-state seed, week-close automation, events, SPE-1042 vault architecture,
SPE-1046 clearance, SPE-867 evidence chain-of-custody, SPE-1456 logistics-flow, SPE-1621
seal-opening hazard, SPE-1314 policy umbrella, hauling, lots, typed overflow/loss,
capacity-as-warehouse, or version bumps. Do not close SPE-1027, SPE-1052, or SPE-877. Do not pick
SPE-62 / SPE-2217 / SPE-2847 / SPE-73.

## Seam

`GameState.facilityStockQuarantine` is an optional map of authored node ids
(`cursed_object_quarantine`) to compact isolation ids (`quarantined` | `clean`).
`parseFacilityStockQuarantine` hydrates through `runTransfer`: omit / non-record / empty after
sanitize → undefined. Only own enumerable authored string-key entries participate; inherited,
non-enumerable, symbol, unknown, integer-index, prototype-unsafe, and invalid-isolation siblings
drop independently. Valid entries are rebuilt in authored node-id order, and domain parser/writer
snapshots are frozen.

`stampFacilityQuarantine(state, { nodeId, isolation })` is caller-owned and accepts only an own
enumerable authored node id plus authored isolation. Unknown, malformed, missing, inherited, or
non-enumerable node ids → `invalid_node` with the original state reference. Unknown, malformed,
missing, inherited, or non-enumerable isolation ids → `invalid_isolation`. Stamping the opposite
isolation onto an already-stamped node → `mix_mismatch` with the original state reference. Success
immutably stamps `cursed_object_quarantine` → the authored isolation; repeated identical writes
are idempotent in meaning.

`resolveFacilityQuarantineSeparation(state, { nodeId, isolation })` is read-only and applies the
same fail-closed node-id and isolation validation. Unknown or malformed node id → `invalid_node`.
Unknown or malformed isolation → `invalid_isolation`. Omitted or absent node isolation resolves
`separation: 'unknown'` (not mixed and not clean). Matching isolation resolves `separated`.
Opposite isolation fail-closes `mix_mismatch`. Empty/omit is not clean and not quarantined.
Resolve returns the same state reference and does not stamp. Hydration does not replay stamp or
resolve, and omitted persisted input does not inherit isolation from the hydration fallback.

## Deferred

| Item or mechanic                           | Owner or prerequisite                                     | Why deferred                                                              |
| ------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| Hauling labor as a bottleneck              | later SPE-1027 child                                      | Handlers/carts/routes are outside quarantine                              |
| Lots                                       | later SPE-1027 child                                      | Lot identity is not this node stamp                                       |
| Typed overflow / real loss                 | later SPE-1027 child                                      | Forced triage and loss are a later warehouse slice                        |
| Misfile events                             | later SPE-1027 child                                      | SPE-2890 already covers wrong-zone; remaining mismatch AC is not this mix |
| Qty-vs-capacity warehouse                  | later SPE-1027 child                                      | Live capacity is not this authored isolation                              |
| Parent targeted tests for hauling/mismatch | later SPE-1027 children                                   | Parent AC language remains open                                           |
| Personnel clearance                        | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) | Do not create a parallel clearance system                                 |
| Evidence chain-of-custody                  | [SPE-867](https://linear.app/spectranoir/issue/SPE-867)   | Isolation stamp only                                                      |
| Vault security                             | [SPE-1042](https://linear.app/spectranoir/issue/SPE-1042) | Not a vault-architecture implementation                                   |
| Seal-opening hazard release                | [SPE-1621](https://linear.app/spectranoir/issue/SPE-1621) | Isolation stamp, not seal breach                                          |
| Logistics-flow layer                       | [SPE-1456](https://linear.app/spectranoir/issue/SPE-1456) | No hauling or carrier/route simulator                                     |
| Low-grade anomaly storage policy           | [SPE-1314](https://linear.app/spectranoir/issue/SPE-1314) | One concrete node, not the policy umbrella                                |
| Player command / UI                        | later SPE-1027 / topology UI child                        | Domain helper only this slice                                             |
| Production starting-state seed             | later SPE-1027 child                                      | Match the unseeded optional facility-map pattern                          |
| Week-close automation and events           | later integration child                                   | Caller-owned helper and persisted map only                                |

## Acceptance

- Stamp complete `cursed_object_quarantine` + `quarantined` and resolve matching isolation → `ok`; `separation: 'separated'`
- Stamp `cursed_object_quarantine` + `clean` and resolve matching isolation → `ok`; `separation: 'separated'`, distinct from quarantined
- Omitted or absent node isolation resolve → `ok`; `separation: 'unknown'`, not mixed and not clean
- Stamp or resolve the opposite isolation against a stamped node → `mix_mismatch`; original state reference returned
- Unknown, raw, missing, inherited, or non-enumerable node id → `invalid_node`; original state reference returned
- Unknown, raw, missing, inherited, or non-enumerable isolation → `invalid_isolation`; original state reference returned
- Stamp is immutable and idempotent in meaning; parser/writer snapshots are frozen; resolve is read-only
- Hydration accepts only own enumerable valid authored siblings, drops malformed siblings independently, and does not inherit omitted fallback isolation
- Save/load preserves a valid snapshot without replaying stamp
- Unrelated facility state including `facilityStockCondition`, `facilityStockpile`, `facilityStockOverflow`, `facilityStockPlacement`, and `facilitySecuredNodes` is preserved and `consumeFacilityStock` remains unchanged and ungated
- SPE-2891 stock-condition spoilage/contamination remains regression-clean and is not recoded
- Parent SPE-1027 remains Backlog; SPE-1052 remains Backlog; SPE-877 remains Backlog; GitHub #1036 stays OPEN

## Validation

- `npm run test:run -- src/test/facilityStockQuarantine.contract.test.ts`
- `npm run test:run -- src/test/facilityStockSpoilage.contract.test.ts`
- `npm run test:run -- src/test/facilityStockpile.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run format:check`
- `git diff --check`
