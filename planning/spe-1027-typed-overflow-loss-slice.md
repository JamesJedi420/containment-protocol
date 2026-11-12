# SPE-2980 — Authored typed overflow forced triage or real loss

| Field               | Value                                                                                                                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                                                                                                            |
| **Linear**          | [SPE-2980](https://linear.app/spectranoir/issue/SPE-2980/authored-typed-overflow-forced-triage-or-real-loss)                                                                                                                                                    |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog**                                                                                                                           |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                                                                                                                               |
| **Related**         | [SPE-2895](https://linear.app/spectranoir/issue/SPE-2895) access-blocked overflow inspect-only; [SPE-2979](https://linear.app/spectranoir/issue/SPE-2979) lots inspect-only; [SPE-2887](https://linear.app/spectranoir/issue/SPE-2887) qty consume inspect-only |
| **Branch**          | `cursor/spe-1027-typed-overflow-loss-909b`                                                                                                                                                                                                                      |
| **Base `main` SHA** | `baf85aec43c4bb48b1f857abeabebf653b7ba5b1`                                                                                                                                                                                                                      |

## Pre-coding summary

**Status on `main`:** not implemented. `facilityTypedOverflowLoss` is absent from `src/` and
`SCHEMA_REGISTRY.md`. AC1–AC9 + SPE-2934 quarantine + SPE-2935 hauling + SPE-2979 lots shipped;
leftover warehouse starts with typed overflow/loss distinct from SPE-2895 access-blocked.

**Relevant files:** `src/domain/facilityStockOverflow.ts` +
`src/test/facilityStockOverflow.contract.test.ts` (access-blocked — inspect-only neighbor);
`src/domain/facilityWarehouseLots.ts` (optional-map pattern, inspect-only);
`src/domain/facilityHaulingLabor.ts` (optional-map pattern, inspect-only);
`src/app/store/runTransfer.ts` (hydrate + `stripUndefinedFields`); `src/domain/models.ts`;
`SCHEMA_REGISTRY.md`; `planning/backlog.md` + `planning/backlog-handoff-manifest.json`.

**Current behavior:** SPE-2895 `facilityStockOverflow` stamps `evidence_cage` → `overflowing` and
resolves access `blocked` vs omit `clear`. There is no authored typed loss or forced triage.
Access-blocked can be mistaken for typed loss.

**Expected behavior:** one authored `evidence_overflow` persists compact `forced_triage` or
`real_loss`. Omit/absent resolve is `outcome: 'none'`, not SPE-2895 blocked, not triage, and not
loss. Present stamped outcome resolves that typed outcome. Invalid/inherited/hidden overflow or
outcome fail-closes with the original state reference. Save/load preserves valid snapshots;
malformed siblings drop independently. SPE-2895 blocked remains distinct and ungated.

**Boundary:** leftover SPE-1027 typed overflow/loss only. New optional `GameState` sibling map.
No misfile events, capacity-as-warehouse, UI, events, week-close, seed, version bump, SPE-1456
carrier/route, recode SPE-2895 overflow / SPE-2979 lots / SPE-2887 consume, or mix into qty,
lots, hauling, or quarantine.

**Risks:** treating SPE-2895 blocked as typed loss; hydration fallback inheritance; mixing this
map into stockpile qty, lots, hauling, overflow, placement, quarantine, or secured-node maps;
shipping misfile or capacity in the same child; closing SPE-1027 because lots shipped.

**Validation:** `src/test/facilityTypedOverflowLoss.contract.test.ts`, then SPE-2895 overflow /
SPE-2979 lots / SPE-2887 consume tests, lint, backlog-handoff, format, `git diff --check`.

**Docs:** this slice doc, `SCHEMA_REGISTRY.md`, `planning/backlog.md`,
`planning/backlog-handoff-manifest.json`.

## Boundary

Ship one authored typed overflow outcome so overflow is not only SPE-2895 access-blocked.

Reuse the optional-map parse/hydrate pattern from `facilityStockOverflow` /
`facilityWarehouseLots` / `facilityHaulingLabor` / `facilityStockQuarantine`. Do not recode
SPE-2887 `consumeFacilityStock`, SPE-2870 blast-door repair, SPE-2890
`handleAccessControlledStock`, SPE-2891 `applyIncorrectStorageSpoilage`, SPE-2892 caches,
SPE-2895 overflow, SPE-2896 preparedness, SPE-2897 protection goods, SPE-2911 restricted-object
release, SPE-2933 secured nodes, SPE-2934 quarantine, SPE-2935 hauling, or SPE-2979 lots. Do not
mix this map into spare-part quantity, warehouse lots, hauling labor, placement,
condition/spoilage, caches, SPE-2895 access-blocked overflow, preparedness, protection goods,
restricted-object release, secured-node maps, or quarantine isolation. Do not debit or gate
`facilityStockpile` or catalog `GameState.inventory`. Do not treat SPE-2895 `blocked` as typed
loss or triage. Do not add player UI, production starting-state seed, week-close automation,
events, SPE-1042 vault architecture, SPE-1046 clearance, SPE-867 evidence chain-of-custody,
SPE-1456 logistics-flow, SPE-1621 seal-opening hazard, SPE-1314 policy umbrella, misfile events,
capacity-as-warehouse, or version bumps. Do not close SPE-1027, SPE-1052, or SPE-877. Do not
pick SPE-62 / SPE-2217 / SPE-2847 / SPE-73 / SPE-40.

## Seam

`GameState.facilityTypedOverflowLoss` is an optional map of authored overflow type ids
(`evidence_overflow`) to compact stamped outcomes (`forced_triage` | `real_loss`).
`parseFacilityTypedOverflowLoss` hydrates through `runTransfer`: omit / non-record / empty after
sanitize → undefined. Only own enumerable authored string-key entries participate; inherited,
non-enumerable, symbol, unknown, integer-index, prototype-unsafe, access-blocked-shaped, and
invalid-outcome siblings drop independently. Valid entries are rebuilt in authored overflow-id
order, and domain parser/writer snapshots are frozen.

`stampFacilityTypedOverflowLoss(state, { overflowId, outcome })` is caller-owned and accepts
only an own enumerable authored overflow id plus authored stamped outcome. Unknown, malformed,
missing, inherited, or non-enumerable overflow ids → `invalid_overflow` with the original state
reference. Unknown, malformed, missing, inherited, non-enumerable, or access-blocked-shaped
outcomes → `invalid_outcome`. Success immutably stamps `evidence_overflow` → `forced_triage` or
`real_loss`; repeated identical writes are idempotent in meaning.

`resolveFacilityTypedOverflowLoss(state, { overflowId })` is read-only and applies the same
fail-closed overflow-id validation. Unknown or malformed overflow id → `invalid_overflow`.
Omitted or absent typed overflow resolves `outcome: 'none'` (not SPE-2895 blocked, not triage,
and not loss). Present stamped outcome resolves that typed outcome. Resolve returns the same
state reference and does not stamp. Hydration does not replay stamp or resolve, and omitted
persisted input does not inherit typed overflow from the hydration fallback.

## Deferred

| Item or mechanic                   | Owner or prerequisite                                     | Why deferred                                                              |
| ---------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| Misfile events                     | later SPE-1027 child                                      | SPE-2890 already covers wrong-zone; remaining mismatch AC is not this map |
| Qty-vs-capacity warehouse          | later SPE-1027 child                                      | Live capacity is not this authored typed overflow                         |
| Parent targeted tests for mismatch | later SPE-1027 children                                   | Parent AC language remains open                                           |
| Personnel clearance                | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) | Do not create a parallel clearance system                                 |
| Evidence chain-of-custody          | [SPE-867](https://linear.app/spectranoir/issue/SPE-867)   | Typed overflow stamp only                                                 |
| Vault security                     | [SPE-1042](https://linear.app/spectranoir/issue/SPE-1042) | Not a vault-architecture implementation                                   |
| Seal-opening hazard release        | [SPE-1621](https://linear.app/spectranoir/issue/SPE-1621) | Typed overflow stamp, not seal breach                                     |
| Logistics-flow layer               | [SPE-1456](https://linear.app/spectranoir/issue/SPE-1456) | No carrier/route simulator                                                |
| Low-grade anomaly storage policy   | [SPE-1314](https://linear.app/spectranoir/issue/SPE-1314) | One concrete overflow type, not the policy umbrella                       |
| Player command / UI                | later SPE-1027 / topology UI child                        | Domain helper only this slice                                             |
| Production starting-state seed     | later SPE-1027 child                                      | Match the unseeded optional facility-map pattern                          |
| Week-close automation and events   | later integration child                                   | Caller-owned helper and persisted map only                                |

## Acceptance

- Stamp complete `evidence_overflow` + `forced_triage` or `real_loss` and resolve → `ok`; matching typed outcome
- Omitted or absent typed overflow resolve → `ok`; `outcome: 'none'`, not SPE-2895 `blocked`, not triage, and not loss
- SPE-2895 access-blocked overflow does not stamp or resolve typed loss; typed stamp does not stamp access-blocked overflow
- Unknown, raw, missing, inherited, or non-enumerable overflow id → `invalid_overflow`; original state reference returned
- Unknown, raw, missing, inherited, non-enumerable, or access-blocked-shaped outcome → `invalid_outcome`; original state reference returned
- Stamp is immutable and idempotent in meaning; parser/writer snapshots are frozen; resolve is read-only
- Hydration accepts only own enumerable valid authored siblings, drops malformed siblings independently, and does not inherit omitted fallback typed overflow
- Save/load preserves a valid snapshot without replaying stamp
- Unrelated facility state including `facilityStockpile`, `facilityStockOverflow`, `facilityWarehouseLots`, `facilityHaulingLabor`, `facilityStockQuarantine`, `facilityEmergencyCaches`, `facilityStockPlacement`, and `facilitySecuredNodes` is preserved and `consumeFacilityStock` remains unchanged and ungated
- SPE-2895 overflow, SPE-2979 lots, and SPE-2887 consume remain regression-clean and are not recoded
- Parent SPE-1027 remains Backlog; SPE-1052 remains Backlog; SPE-877 remains Backlog; GitHub #1036 stays OPEN

## Validation

- `npm run test:run -- src/test/facilityTypedOverflowLoss.contract.test.ts`
- `npm run test:run -- src/test/facilityStockOverflow.contract.test.ts`
- `npm run test:run -- src/test/facilityWarehouseLots.contract.test.ts`
- `npm run test:run -- src/test/facilityStockpile.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run format:check`
- `git diff --check`
