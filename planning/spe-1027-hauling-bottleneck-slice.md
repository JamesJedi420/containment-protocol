# SPE-2935 — Authored hauling labor bottleneck so body transfers require handlers

| Field               | Value                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                  |
| **Linear**          | [SPE-2935](https://linear.app/spectranoir/issue/SPE-2935/authored-hauling-labor-bottleneck-so-body-transfers-require-handlers)        |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog** |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**     |
| **Related**         | [SPE-2892](https://linear.app/spectranoir/issue/SPE-2892) — inspect only; do not recode emergency-cache timing                        |
| **Branch**          | `cursor/spe-1027-hauling-bottleneck-ea0e`                                                                                             |
| **Base `main` SHA** | `808ac0e94a7e8bbc6ae1e47695735d125f7fbac7`                                                                                            |

## Pre-coding summary

**Status on `main`:** not implemented. `facilityHaulingLabor` is absent from `src/` and
`SCHEMA_REGISTRY.md`. AC1–AC9 + SPE-2934 quarantine shipped; leftover warehouse starts with
hauling labor.

**Relevant files:** `src/domain/facilityStockQuarantine.ts` +
`src/test/facilityStockQuarantine.contract.test.ts` (optional-map pattern);
`src/domain/facilityEmergencyCache.ts` (SPE-2892 inspect-only neighbor);
`src/domain/facilityStockOverflow.ts`; `src/app/store/runTransfer.ts` (hydrate +
`stripUndefinedFields`); `src/domain/models.ts`; `SCHEMA_REGISTRY.md`; `planning/backlog.md` +
`planning/backlog-handoff-manifest.json`.

**Current behavior:** evidence, bodies, artifacts, and supplies have no authored hauling labor.
Omit is indistinguishable from present handlers, so cargo can teleport. SPE-2892 cache timing is
not a haul bottleneck.

**Expected behavior:** one authored `body_transfer` persists compact labor `handlers_available`.
Omit/absent resolve is `bottlenecked`, not `moved` and not instant teleport. Matching present
labor resolves `moved`. Invalid/inherited/hidden cargo or labor fail-closes with the original
state reference. Save/load preserves valid snapshots; malformed siblings drop independently.

**Boundary:** leftover SPE-1027 hauling labor only. New optional `GameState` sibling map. No lots,
typed overflow/loss, misfile events, capacity-as-warehouse, UI, events, week-close, seed, version
bump, SPE-1456 carrier/route simulator, or SPE-2892 recode.

**Risks:** treating omit as free/instant haul; hydration fallback inheritance; mixing this map
into stockpile qty, overflow, placement, quarantine, or secured-node maps; shipping extra
warehouse children; closing SPE-1027 because AC1–AC9 + quarantine are Done.

**Validation:** `src/test/facilityHaulingLabor.contract.test.ts`, then SPE-2892 cache / SPE-2887
consume / SPE-2934 quarantine tests, lint, backlog-handoff, format, `git diff --check`.

**Docs:** this slice doc, `SCHEMA_REGISTRY.md`, `planning/backlog.md`,
`planning/backlog-handoff-manifest.json`.

## Boundary

Ship one authored hauling bottleneck so bodies require handlers instead of teleporting.

Reuse the optional-map parse/hydrate pattern from `facilityStockQuarantine` /
`facilitySecuredNodes` / `facilityRestrictedObjectRelease` / `facilityProtectionGoods`. Do not
recode SPE-2887 `consumeFacilityStock`, SPE-2870 blast-door repair, SPE-2890
`handleAccessControlledStock`, SPE-2891 `applyIncorrectStorageSpoilage`, SPE-2892 caches,
SPE-2895 overflow, SPE-2896 preparedness, SPE-2897 protection goods, SPE-2911 restricted-object
release, SPE-2933 secured nodes, or SPE-2934 quarantine. Do not mix this map into spare-part
quantity, placement, condition/spoilage, caches, overflow, preparedness, protection goods,
restricted-object release, secured-node maps, or quarantine isolation. Do not debit or gate
`facilityStockpile` or catalog `GameState.inventory`. Do not add player UI, production
starting-state seed, week-close automation, events, SPE-1042 vault architecture, SPE-1046
clearance, SPE-867 evidence chain-of-custody, SPE-1456 logistics-flow, SPE-1621 seal-opening
hazard, SPE-1314 policy umbrella, lots, typed overflow/loss, misfile events,
capacity-as-warehouse, or version bumps. Do not close SPE-1027, SPE-1052, or SPE-877. Do not pick
SPE-62 / SPE-2217 / SPE-2847 / SPE-73 / SPE-40.

## Seam

`GameState.facilityHaulingLabor` is an optional map of authored cargo ids (`body_transfer`) to
compact labor ids (`handlers_available`). `parseFacilityHaulingLabor` hydrates through
`runTransfer`: omit / non-record / empty after sanitize → undefined. Only own enumerable authored
string-key entries participate; inherited, non-enumerable, symbol, unknown, integer-index,
prototype-unsafe, and invalid-labor siblings drop independently. Valid entries are rebuilt in
authored cargo-id order, and domain parser/writer snapshots are frozen.

`stampFacilityHaulingLabor(state, { cargoId, labor })` is caller-owned and accepts only an own
enumerable authored cargo id plus authored labor. Unknown, malformed, missing, inherited, or
non-enumerable cargo ids → `invalid_cargo` with the original state reference. Unknown, malformed,
missing, inherited, or non-enumerable labor ids → `invalid_labor`. Success immutably stamps
`body_transfer` → `handlers_available`; repeated identical writes are idempotent in meaning.

`resolveFacilityHaulBottleneck(state, { cargoId, labor })` is read-only and applies the same
fail-closed cargo-id and labor validation. Unknown or malformed cargo id → `invalid_cargo`.
Unknown or malformed labor → `invalid_labor`. Omitted or absent cargo labor resolves
`outcome: 'bottlenecked'` (not moved and not instant teleport). Matching present labor resolves
`moved`. Empty/omit is not a free haul. Resolve returns the same state reference and does not
stamp. Hydration does not replay stamp or resolve, and omitted persisted input does not inherit
labor from the hydration fallback.

## Deferred

| Item or mechanic                   | Owner or prerequisite                                     | Why deferred                                                               |
| ---------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| Lots                               | later SPE-1027 child                                      | Lot identity is not this labor stamp                                       |
| Typed overflow / real loss         | later SPE-1027 child                                      | Forced triage and loss are a later warehouse slice                         |
| Misfile events                     | later SPE-1027 child                                      | SPE-2890 already covers wrong-zone; remaining mismatch AC is not this haul |
| Qty-vs-capacity warehouse          | later SPE-1027 child                                      | Live capacity is not this authored labor                                   |
| Parent targeted tests for mismatch | later SPE-1027 children                                   | Parent AC language remains open                                            |
| Personnel clearance                | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) | Do not create a parallel clearance system                                  |
| Evidence chain-of-custody          | [SPE-867](https://linear.app/spectranoir/issue/SPE-867)   | Labor stamp only                                                           |
| Vault security                     | [SPE-1042](https://linear.app/spectranoir/issue/SPE-1042) | Not a vault-architecture implementation                                    |
| Seal-opening hazard release        | [SPE-1621](https://linear.app/spectranoir/issue/SPE-1621) | Labor stamp, not seal breach                                               |
| Logistics-flow layer               | [SPE-1456](https://linear.app/spectranoir/issue/SPE-1456) | No carrier/route simulator                                                 |
| Low-grade anomaly storage policy   | [SPE-1314](https://linear.app/spectranoir/issue/SPE-1314) | One concrete cargo, not the policy umbrella                                |
| Player command / UI                | later SPE-1027 / topology UI child                        | Domain helper only this slice                                              |
| Production starting-state seed     | later SPE-1027 child                                      | Match the unseeded optional facility-map pattern                           |
| Week-close automation and events   | later integration child                                   | Caller-owned helper and persisted map only                                 |

## Acceptance

- Stamp complete `body_transfer` + `handlers_available` and resolve matching labor → `ok`; `outcome: 'moved'`
- Omitted or absent cargo labor resolve → `ok`; `outcome: 'bottlenecked'`, not moved and not instant teleport
- Unknown, raw, missing, inherited, or non-enumerable cargo id → `invalid_cargo`; original state reference returned
- Unknown, raw, missing, inherited, or non-enumerable labor → `invalid_labor`; original state reference returned
- Stamp is immutable and idempotent in meaning; parser/writer snapshots are frozen; resolve is read-only
- Hydration accepts only own enumerable valid authored siblings, drops malformed siblings independently, and does not inherit omitted fallback labor
- Save/load preserves a valid snapshot without replaying stamp
- Unrelated facility state including `facilityStockQuarantine`, `facilityEmergencyCaches`, `facilityStockpile`, `facilityStockOverflow`, `facilityStockPlacement`, and `facilitySecuredNodes` is preserved and `consumeFacilityStock` remains unchanged and ungated
- SPE-2892 emergency-cache timing, SPE-2887 consume, and SPE-2934 quarantine remain regression-clean and are not recoded
- Parent SPE-1027 remains Backlog; SPE-1052 remains Backlog; SPE-877 remains Backlog; GitHub #1036 stays OPEN

## Validation

- `npm run test:run -- src/test/facilityHaulingLabor.contract.test.ts`
- `npm run test:run -- src/test/facilityEmergencyCache.contract.test.ts`
- `npm run test:run -- src/test/facilityStockpile.contract.test.ts`
- `npm run test:run -- src/test/facilityStockQuarantine.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run format:check`
- `git diff --check`
