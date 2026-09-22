# SPE-2982 — Authored storage capacity qty-vs-capacity (capacity-as-warehouse)

| Field               | Value                                                                                                                                                                                                                                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Done**                                                                                                                                                                                                                                                                                                                                                   |
| **Linear**          | [SPE-2982](https://linear.app/spectranoir/issue/SPE-2982/authored-storage-capacity-qty-vs-capacity-capacity-as-warehouse)                                                                                                                                                                                                                                  |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog**                                                                                                                                                                                                                      |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                                                                                                                                                                                                                          |
| **Related**         | [SPE-2895](https://linear.app/spectranoir/issue/SPE-2895) overflow boolean (inspect-only); [SPE-2887](https://linear.app/spectranoir/issue/SPE-2887) qty consume inspect-only; [SPE-2981](https://linear.app/spectranoir/issue/SPE-2981) misfile optional-map pattern; [SPE-2896](https://linear.app/spectranoir/issue/SPE-2896) preparedness inspect-only |
| **Branch**          | `cursor/spe-1027-capacity-as-warehouse-9e7c-3774`                                                                                                                                                                                                                                                                                                          |
| **Base `main` SHA** | `f2be403c302fa74f468689813a0196ca89792311` (`f2be403c` — SPE-2982 planning slice merge)                                                                                                                                                                                                                                                                    |

## Pre-coding summary

**Status on `main` at base:** not implemented. No authored qty-vs-capacity
optional map exists beyond SPE-2895 boolean overflowing→blocked and SPE-2896
preparedness quantity-vs-reserve/outflow. SPE-2981 deferred capacity-as-warehouse
to a later SPE-1027 child. Backlog handoff lists capacity-as-warehouse + parent
targeted-test language as remaining warehouse leftovers.

**Relevant files:** `src/domain/facilityStockOverflow.ts` +
`src/test/facilityStockOverflow.contract.test.ts` (SPE-2895 boolean overflow —
inspect-only neighbor); `src/domain/facilityStockpile.ts` +
`src/test/facilityStockpile.contract.test.ts` (SPE-2887 consume — keep green);
`src/domain/facilityStockPreparedness.ts` +
`src/test/facilityStockPreparedness.contract.test.ts` (SPE-2896 — inspect-only);
`src/domain/facilityInventoryMismatch.ts` +
`src/test/facilityInventoryMismatch.contract.test.ts` (SPE-2981 optional-map
stamp/resolve pattern to reuse); `src/app/store/runTransfer.ts` (hydrate +
`stripUndefinedFields`); `src/domain/models.ts`; `SCHEMA_REGISTRY.md`;
`planning/backlog.md` + `planning/backlog-handoff-manifest.json`.

**Current behavior:** SPE-2895 stamps overflowing on `evidence_cage` and resolve
returns `blocked` / omit returns `clear`. There is no authored qty-vs-capacity
map comparing live quantity to capacity. SPE-2895 boolean overflow can be
mistaken for capacity-as-warehouse.

**Expected behavior:** one authored `evidence_cage` persists compact
`{ quantity, capacity }` (safe non-negative integers). Omit/absent resolve is
`unknown`, not SPE-2895 `blocked` / `clear`, and not a default capacity. Present
snapshot with `quantity > capacity` resolves `over_capacity`; otherwise
`within_capacity`. Invalid/inherited/hidden node or snapshot fail-closes with the
original state reference. Save/load preserves valid snapshots; malformed siblings
drop independently. SPE-2895 overflow remains distinct and ungated.
`consumeFacilityStock` stays ungated.

**Boundary:** leftover SPE-1027 capacity-as-warehouse / qty-vs-capacity only. New
optional `GameState` sibling map (e.g. `facilityStorageCapacity`). No parent
targeted-test language leftovers, UI, events, week-close, seed, version bump,
SPE-1456 carrier/route, recode SPE-2895 overflow / SPE-2896 preparedness /
SPE-2981 misfile / SPE-2980 typed overflow / SPE-2979 lots / SPE-2887 consume, or
mix into qty, lots, hauling, quarantine, overflow, placement, misfile,
typed-overflow, or preparedness maps.

**Risks:** treating SPE-2895 `blocked`/`clear` as qty-vs-capacity; hydration
fallback inheritance; mixing this map into stockpile qty, overflow, preparedness,
lots, typed overflow, misfile, hauling, placement, quarantine, or secured-node
maps; gating consume from capacity; shipping parent targeted-test language in the
same child; closing SPE-1027 because capacity shipped.

**Validation:** `src/test/facilityStorageCapacity.contract.test.ts` (name may
match final module), then SPE-2895 overflow / SPE-2896 preparedness / SPE-2981
misfile / SPE-2887 consume tests, lint, backlog-handoff, format,
`git diff --check`.

**Docs:** this slice doc, `SCHEMA_REGISTRY.md`, `planning/backlog.md`,
`planning/backlog-handoff-manifest.json`.

## Boundary

Ship one authored warehouse capacity node so SPE-1027’s capacity-as-warehouse
leftover is true beyond SPE-2895 boolean overflowing→blocked.

Reuse the optional-map parse/hydrate pattern from `facilityInventoryMismatch` /
`facilityTypedOverflowLoss` / `facilityWarehouseLots` / `facilityStockOverflow` /
`facilityStockPreparedness` / `facilityHaulingLabor` / `facilityStockQuarantine`.
Do not invent a parallel subsystem. Do not recode SPE-2887
`consumeFacilityStock`, SPE-2870 blast-door repair, SPE-2890
`handleAccessControlledStock`, SPE-2891 spoilage, SPE-2892 caches, SPE-2895
overflow, SPE-2896 preparedness, SPE-2897 protection goods, SPE-2911
restricted-object release, SPE-2933 secured nodes, SPE-2934 quarantine,
SPE-2935 hauling, SPE-2979 lots, SPE-2980 typed overflow, or SPE-2981 misfile. Do
not mix this map into spare-part quantity, warehouse lots, typed overflow/loss,
misfile, hauling labor, placement, condition/spoilage, caches, SPE-2895
access-blocked overflow, preparedness, protection goods, restricted-object
release, secured-node maps, or quarantine isolation. Do not debit or gate
`facilityStockpile` or catalog `GameState.inventory`. Do not treat SPE-2895
`blocked`/`clear` as qty-vs-capacity. Do not add player UI, production
starting-state seed, week-close automation, events, parent targeted-test
language leftovers, SPE-1042 vault architecture, SPE-1046 clearance, SPE-867
evidence chain-of-custody, SPE-1456 logistics-flow, SPE-1621 seal-opening hazard,
SPE-1314 policy umbrella, or version bumps. Do not close SPE-1027, SPE-1052, or
SPE-877. Do not pick SPE-62 / SPE-2217 / SPE-2847 / SPE-73 / SPE-40.

## Seam

`GameState.facilityStorageCapacity` (name may match final module) is an optional
map of authored warehouse node ids (`evidence_cage`) to compact stamped
`{ quantity, capacity }` snapshots (safe non-negative integers).
`parseFacilityStorageCapacity` hydrates through `runTransfer`: omit / non-record /
empty after sanitize → undefined. Only own enumerable authored string-key entries
participate; inherited, non-enumerable, symbol, unknown, integer-index,
prototype-unsafe, overflow-shaped, preparedness-shaped, and invalid-snapshot
siblings drop independently. Valid entries are rebuilt in authored node-id order,
and domain parser/writer snapshots are frozen.

`stampFacilityStorageCapacity(state, { nodeId, quantity, capacity })` (name may
match final API) is caller-owned and accepts only an own enumerable authored node
id plus safe non-negative integer quantity and capacity. Unknown, malformed,
missing, inherited, or non-enumerable node ids → `invalid_node` with the original
state reference. Unknown, malformed, missing, negative, non-integer, inherited, or
non-enumerable quantity/capacity → `invalid_snapshot`. Success immutably stamps
`evidence_cage` → `{ quantity, capacity }`; repeated identical writes are
idempotent in meaning.

`resolveFacilityStorageCapacity(state, { nodeId })` is read-only and applies the
same fail-closed node-id validation. Unknown or malformed node id →
`invalid_node`. Omitted or absent node resolves `unknown` (not SPE-2895
`blocked`/`clear`, and not a default capacity). Present snapshot with
`quantity > capacity` resolves `over_capacity`; otherwise `within_capacity`.
Resolve returns the same state reference and does not stamp. Hydration does not
replay stamp or resolve, and omitted persisted input does not inherit capacity
from the hydration fallback.

## Deferred

| Item or mechanic                 | Owner or prerequisite                                     | Why deferred                                         |
| -------------------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| Parent targeted-test language    | later SPE-1027 child                                      | Parent AC language remains open beyond this one node |
| Multi-node warehouse network     | later SPE-1027 child                                      | One authored node only this slice                    |
| Personnel clearance              | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) | Do not create a parallel clearance system            |
| Evidence chain-of-custody        | [SPE-867](https://linear.app/spectranoir/issue/SPE-867)   | Capacity stamp only                                  |
| Vault security                   | [SPE-1042](https://linear.app/spectranoir/issue/SPE-1042) | Not a vault-architecture implementation              |
| Seal-opening hazard release      | [SPE-1621](https://linear.app/spectranoir/issue/SPE-1621) | Capacity stamp, not seal breach                      |
| Logistics-flow layer             | [SPE-1456](https://linear.app/spectranoir/issue/SPE-1456) | No carrier/route simulator                           |
| Low-grade anomaly storage policy | [SPE-1314](https://linear.app/spectranoir/issue/SPE-1314) | One concrete capacity node, not the policy umbrella  |
| Player command / UI              | later SPE-1027 / topology UI child                        | Domain helper only this slice                        |
| Production starting-state seed   | later SPE-1027 child                                      | Match the unseeded optional facility-map pattern     |
| Week-close automation and events | later integration child                                   | Caller-owned helper and persisted map only           |

## Acceptance

- Stamp complete `evidence_cage` + `{ quantity, capacity }` and resolve → `ok`; matching qty-vs-capacity outcome (`within_capacity` or `over_capacity`)
- Omitted or absent node resolve → `ok`; `unknown`, not SPE-2895 `blocked`/`clear`
- Present `quantity > capacity` resolve → `over_capacity`; otherwise present resolve → `within_capacity`
- SPE-2895 overflow does not stamp or resolve this map; this stamp does not produce `blocked`/`clear`
- Unknown, raw, missing, inherited, or non-enumerable node id → `invalid_node`; original state reference returned
- Unknown, raw, missing, negative, non-integer, inherited, or non-enumerable quantity/capacity → `invalid_snapshot`; original state reference returned
- Stamp is immutable and idempotent in meaning; parser/writer snapshots are frozen; resolve is read-only
- Hydration accepts only own enumerable valid authored siblings, drops malformed siblings independently, and does not inherit omitted fallback capacity
- Save/load preserves a valid snapshot without replaying stamp
- Unrelated facility state including `facilityStockpile`, `facilityStockOverflow`, `facilityStockPreparedness`, `facilityTypedOverflowLoss`, `facilityInventoryMismatch`, `facilityWarehouseLots`, `facilityHaulingLabor`, `facilityStockQuarantine`, `facilityEmergencyCaches`, `facilityStockPlacement`, and `facilitySecuredNodes` is preserved and `consumeFacilityStock` remains unchanged and ungated
- SPE-2895 overflow, SPE-2896 preparedness, SPE-2981 misfile, and SPE-2887 consume remain regression-clean and are not recoded
- Parent SPE-1027 remains Backlog; SPE-1052 remains Backlog; SPE-877 remains Backlog; GitHub #1036 stays OPEN

## Validation

- `npm run test:run -- src/test/facilityStorageCapacity.contract.test.ts` (adjust to final module name)
- `npm run test:run -- src/test/facilityStockOverflow.contract.test.ts`
- `npm run test:run -- src/test/facilityStockPreparedness.contract.test.ts`
- `npm run test:run -- src/test/facilityInventoryMismatch.contract.test.ts`
- `npm run test:run -- src/test/facilityStockpile.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run format:check`
- `git diff --check`
