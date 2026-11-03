# SPE-2981 — Authored misfile / inventory-mismatch event beyond wrong-zone

| Field               | Value                                                                                                                                                                                                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                                                                                                                                                                                   |
| **Linear**          | [SPE-2981](https://linear.app/spectranoir/issue/SPE-2981/authored-misfile-inventory-mismatch-event-beyond-wrong-zone)                                                                                                                                                                                                                  |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog**                                                                                                                                                                                                  |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                                                                                                                                                                                                      |
| **Related**         | [SPE-2890](https://linear.app/spectranoir/issue/SPE-2890) wrong-zone (inspect-only); [SPE-2980](https://linear.app/spectranoir/issue/SPE-2980) typed overflow pattern; [SPE-2979](https://linear.app/spectranoir/issue/SPE-2979) lots optional-map; [SPE-2887](https://linear.app/spectranoir/issue/SPE-2887) qty consume inspect-only |
| **Branch**          | `cursor/spe-1027-misfile-inventory-mismatch-82a0`                                                                                                                                                                                                                                                                                      |
| **Base `main` SHA** | `fc3bcfc0bc70be5ce61104e521c7ba2c1bd58d6a` (`fc3bcfc0` — SPE-2980 typed overflow merge)                                                                                                                                                                                                                                                |

## Pre-coding summary

**Status on `main` at base:** not implemented. No authored misfile / inventory-mismatch
optional map exists beyond SPE-2890 wrong-zone handle. SPE-2980 deferred misfile to a later
SPE-1027 child. Backlog handoff lists misfile + capacity-as-warehouse as remaining warehouse
leftovers.

**Relevant files:** `src/domain/facilityTypedOverflowLoss.ts` +
`src/test/facilityTypedOverflowLoss.contract.test.ts` (optional-map stamp/resolve pattern to
reuse); `src/domain/facilityWarehouseLots.ts` (SPE-2979 optional-map); `src/domain/facilityStockAccess.ts` +
`src/test/facilityStockAccess.contract.test.ts` (SPE-2890 wrong-zone — inspect-only neighbor);
`src/domain/facilityStockpile.ts` + `src/test/facilityStockpile.contract.test.ts` (SPE-2887
consume — keep green); `src/app/store/runTransfer.ts` (hydrate + `stripUndefinedFields`);
`src/domain/models.ts`; `SCHEMA_REGISTRY.md`; `planning/backlog.md` +
`planning/backlog-handoff-manifest.json`.

**Current behavior:** SPE-2890 stamps placement / returns `wrong_zone` for clearance routing of
`weapons_locker` to `mundane_supplies`. There is no authored inventory-mismatch / misfile event
map. Wrong-zone can be mistaken for misfile.

**Expected behavior:** one authored `cursed_evidence_misfile` persists compact `mismatched`.
Omit/absent resolve is `outcome: 'none'`, not SPE-2890 `wrong_zone`, not clearance_denied, and
not a default mismatch. Present stamped outcome resolves that mismatch. Invalid/inherited/hidden
mismatch or outcome fail-closes with the original state reference. Save/load preserves valid
snapshots; malformed siblings drop independently. SPE-2890 wrong-zone remains distinct and
ungated.

**Boundary:** leftover SPE-1027 misfile / inventory-mismatch only. New optional `GameState`
sibling map. No capacity-as-warehouse, UI, events, week-close, seed, version bump, SPE-1456
carrier/route, recode SPE-2890 wrong-zone / SPE-2980 typed overflow / SPE-2979 lots / SPE-2887
consume, or mix into qty, lots, hauling, quarantine, overflow, placement, or typed-overflow maps.

**Risks:** treating SPE-2890 `wrong_zone` as inventory-mismatch; hydration fallback inheritance;
mixing this map into stockpile qty, lots, typed overflow, hauling, overflow, placement,
quarantine, or secured-node maps; shipping capacity in the same child; closing SPE-1027 because
misfile shipped.

**Validation:** `src/test/facilityInventoryMismatch.contract.test.ts` (name may match final
module), then SPE-2890 access / SPE-2980 typed overflow / SPE-2887 consume tests, lint,
backlog-handoff, format, `git diff --check`.

**Docs:** this slice doc, `SCHEMA_REGISTRY.md`, `planning/backlog.md`,
`planning/backlog-handoff-manifest.json`.

## Boundary

Ship one authored misfile / inventory-mismatch type so SPE-1027’s misfiled-inventory leftover is
true beyond SPE-2890 wrong-zone.

Reuse the optional-map parse/hydrate pattern from `facilityTypedOverflowLoss` /
`facilityWarehouseLots` / `facilityStockOverflow` / `facilityHaulingLabor` /
`facilityStockQuarantine`. Do not invent a parallel subsystem. Do not recode SPE-2887
`consumeFacilityStock`, SPE-2870 blast-door repair, SPE-2890 `handleAccessControlledStock`,
SPE-2891 spoilage, SPE-2892 caches, SPE-2895 overflow, SPE-2896 preparedness, SPE-2897
protection goods, SPE-2911 restricted-object release, SPE-2933 secured nodes, SPE-2934
quarantine, SPE-2935 hauling, SPE-2979 lots, or SPE-2980 typed overflow. Do not mix this map into
spare-part quantity, warehouse lots, typed overflow/loss, hauling labor, placement,
condition/spoilage, caches, SPE-2895 access-blocked overflow, preparedness, protection goods,
restricted-object release, secured-node maps, or quarantine isolation. Do not debit or gate
`facilityStockpile` or catalog `GameState.inventory`. Do not treat SPE-2890 `wrong_zone` as
inventory-mismatch. Do not add player UI, production starting-state seed, week-close automation,
events, capacity-as-warehouse, SPE-1042 vault architecture, SPE-1046 clearance, SPE-867 evidence
chain-of-custody, SPE-1456 logistics-flow, SPE-1621 seal-opening hazard, SPE-1314 policy
umbrella, or version bumps. Do not close SPE-1027, SPE-1052, or SPE-877. Do not pick SPE-62 /
SPE-2217 / SPE-2847 / SPE-73 / SPE-40.

## Seam

`GameState.facilityInventoryMismatch` (name may match final module) is an optional map of authored
mismatch type ids (`cursed_evidence_misfile`) to compact stamped outcomes (`mismatched`).
`parseFacilityInventoryMismatch` hydrates through `runTransfer`: omit / non-record / empty after
sanitize → undefined. Only own enumerable authored string-key entries participate; inherited,
non-enumerable, symbol, unknown, integer-index, prototype-unsafe, wrong-zone-shaped, and
invalid-outcome siblings drop independently. Valid entries are rebuilt in authored mismatch-id
order, and domain parser/writer snapshots are frozen.

`stampFacilityInventoryMismatch(state, { mismatchId, outcome })` is caller-owned and accepts only
an own enumerable authored mismatch id plus authored stamped outcome. Unknown, malformed,
missing, inherited, or non-enumerable mismatch ids → `invalid_mismatch` with the original state
reference. Unknown, malformed, missing, inherited, non-enumerable, or wrong-zone-shaped outcomes
→ `invalid_outcome`. Success immutably stamps `cursed_evidence_misfile` → `mismatched`; repeated
identical writes are idempotent in meaning.

`resolveFacilityInventoryMismatch(state, { mismatchId })` is read-only and applies the same
fail-closed mismatch-id validation. Unknown or malformed mismatch id → `invalid_mismatch`.
Omitted or absent mismatch resolves `outcome: 'none'` (not SPE-2890 `wrong_zone`, not
clearance_denied, and not a default mismatch). Present stamped outcome resolves that mismatch.
Resolve returns the same state reference and does not stamp. Hydration does not replay stamp or
resolve, and omitted persisted input does not inherit mismatch from the hydration fallback.

## Deferred

| Item or mechanic                   | Owner or prerequisite                                     | Why deferred                                         |
| ---------------------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| Capacity-as-warehouse              | later SPE-1027 child                                      | Live qty-vs-capacity is not this authored mismatch   |
| Parent targeted tests for mismatch | later SPE-1027 children                                   | Parent AC language remains open beyond this one type |
| Personnel clearance                | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) | Do not create a parallel clearance system            |
| Evidence chain-of-custody          | [SPE-867](https://linear.app/spectranoir/issue/SPE-867)   | Misfile stamp only                                   |
| Vault security                     | [SPE-1042](https://linear.app/spectranoir/issue/SPE-1042) | Not a vault-architecture implementation              |
| Seal-opening hazard release        | [SPE-1621](https://linear.app/spectranoir/issue/SPE-1621) | Misfile stamp, not seal breach                       |
| Logistics-flow layer               | [SPE-1456](https://linear.app/spectranoir/issue/SPE-1456) | No carrier/route simulator                           |
| Low-grade anomaly storage policy   | [SPE-1314](https://linear.app/spectranoir/issue/SPE-1314) | One concrete mismatch type, not the policy umbrella  |
| Player command / UI                | later SPE-1027 / topology UI child                        | Domain helper only this slice                        |
| Production starting-state seed     | later SPE-1027 child                                      | Match the unseeded optional facility-map pattern     |
| Week-close automation and events   | later integration child                                   | Caller-owned helper and persisted map only           |

## Acceptance

- Stamp complete `cursed_evidence_misfile` + `mismatched` and resolve → `ok`; matching mismatch outcome
- Omitted or absent mismatch resolve → `ok`; `outcome: 'none'`, not SPE-2890 `wrong_zone`, not clearance_denied
- SPE-2890 wrong-zone does not stamp or resolve this map; this stamp does not produce `wrong_zone`
- Unknown, raw, missing, inherited, or non-enumerable mismatch id → `invalid_mismatch`; original state reference returned
- Unknown, raw, missing, inherited, non-enumerable, or wrong-zone-shaped outcome → `invalid_outcome`; original state reference returned
- Stamp is immutable and idempotent in meaning; parser/writer snapshots are frozen; resolve is read-only
- Hydration accepts only own enumerable valid authored siblings, drops malformed siblings independently, and does not inherit omitted fallback mismatch
- Save/load preserves a valid snapshot without replaying stamp
- Unrelated facility state including `facilityStockpile`, `facilityStockOverflow`, `facilityTypedOverflowLoss`, `facilityWarehouseLots`, `facilityHaulingLabor`, `facilityStockQuarantine`, `facilityEmergencyCaches`, `facilityStockPlacement`, and `facilitySecuredNodes` is preserved and `consumeFacilityStock` remains unchanged and ungated
- SPE-2980 typed overflow and SPE-2887 consume remain regression-clean and are not recoded
- Parent SPE-1027 remains Backlog; SPE-1052 remains Backlog; SPE-877 remains Backlog; GitHub #1036 stays OPEN

## Validation

- `npm run test:run -- src/test/facilityInventoryMismatch.contract.test.ts` (adjust to final module name)
- `npm run test:run -- src/test/facilityStockAccess.contract.test.ts`
- `npm run test:run -- src/test/facilityTypedOverflowLoss.contract.test.ts`
- `npm run test:run -- src/test/facilityStockpile.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run format:check`
- `git diff --check`
