# SPE-2896 — Stockout pressure from quantity vs reserve/flow (parent AC6)

| Field               | Value                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**          | **Recently shipped**                                                                                                                                   |
| **Linear**          | [SPE-2896](https://linear.app/spectranoir/issue/SPE-2896)                                                                                              |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog**                  |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                      |
| **Related**         | [SPE-2887](https://linear.app/spectranoir/issue/SPE-2887/named-part-facility-stockpile-consume-helper) — inspect only; spare-part qty is not this port |
| **Branch**          | `cursor/spe-1027-stockout-pressure-3400`                                                                                                               |
| **Base `main` SHA** | `2526704bb433b23520c7c28fa406279a1693b2c5`                                                                                                             |

## Boundary

Ship one authored preparedness snapshot so SPE-1027’s sixth AC is true: preparedness for
`facility_salt` depends on quantity versus reserve and recent outflow, not raw quantity alone. The
same quantity must be able to resolve as `prepared` or `stockout` when reserve or outflow changes.

Reuse the optional-map parse/hydrate pattern from `facilityStockpile` / `facilityStockPlacement` /
`facilityStockCondition` / `facilityEmergencyCaches` / `facilityStockOverflow`. Do not recode
SPE-2775, SPE-2887 `consumeFacilityStock`, SPE-2870 blast-door repair, SPE-2890
`handleAccessControlledStock`, SPE-2891 `applyIncorrectStorageSpoilage`, SPE-2892 cache helpers, or
SPE-2895 overflow helpers. Do not reuse `salt_cache`, `evidence_cage`, SPE-2890
`STORAGE_ZONE_IDS`, SPE-2891 `SPOILAGE_ZONE_IDS`, or `blast_door_hinge_seal`. Do not mix
preparedness into spare-part qty, placement, condition, caches, or overflow. Do not derive the
snapshot from consume history, implement counterfeit goods, restricted-object release,
secured-node threat, misfile events, typed overflow/loss, quarantine, hauling, lots,
capacity-as-warehouse, SPE-1026 CAD, SPE-1473 / SPE-1474, SPE-956 incidents, player UI,
week-close auto-stamp, SPE-2775 feed, or production starting-state seed. Do not invent catalog
`GameState.inventory` as this port. Do not bump `GAME_STORE_VERSION`. Do not close SPE-1027,
SPE-1052, or SPE-877. Do not reopen SPE-2827 / SPE-2848. Do not pick SPE-2847 or SPE-2888.

## Seam

`GameState.facilityStockPreparedness` is an optional map of known preparedness stock ids
(`facility_salt`) to `{ quantity, reserve, recentOutflow }`. All three fields are safe non-negative
integers. `parseFacilityStockPreparedness` hydrates through `runTransfer`: omit / non-record / empty
after sanitize → undefined. Only own enumerable string-key entries participate; inherited,
non-enumerable, and symbol siblings do not enter the persisted snapshot. Unknown, integer-index,
prototype-unsafe, partial, negative, non-integer, and unsafe-integer siblings drop independently.

`stampFacilityStockPreparedness(state, { stockId, quantity, reserve, recentOutflow })` is
caller-owned. Unknown stock → `invalid_stock`. Any negative, non-integer, or unsafe integer field →
`invalid_snapshot`. Failure returns the original state reference. Success immutably stamps the
`facility_salt` snapshot. Catalog inventory and `facilityStockpile` are unchanged.

`resolveFacilityStockoutPressure(state, { stockId })` is read-only. Unknown stock →
`invalid_stock`. Omit or absent → `unknown`. A present snapshot resolves `stockout` when
`quantity < reserve` or `quantity <= recentOutflow`; otherwise it resolves `prepared`. Resolve
returns the same state reference and does not stamp pressure. Hydration does not re-run stamp or
resolve, and omitted persisted input does not inherit preparedness from the hydration fallback.

## Deferred

| Item or mechanic                         | Owner or prerequisite                                                                                       | Why deferred                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Counterfeit goods                        | new SPE-1027 AC7 child                                                                                      | Next numbered parent AC; do not create or implement it in this slice  |
| Restricted-object release                | later SPE-1027 child                                                                                        | Follows counterfeit goods in the parent sequence                      |
| Secured-node threat                      | later SPE-1027 child                                                                                        | Separate threat and security contract                                 |
| Misfile events                           | later SPE-1027 child                                                                                        | SPE-2890 already owns wrong-zone handling                             |
| Typed overflow / real loss               | later SPE-1027 child                                                                                        | Forced triage and loss are a later warehouse slice                    |
| Qty-vs-capacity warehouse                | later SPE-1027 child                                                                                        | This slice compares an authored snapshot, not live capacity           |
| Quarantine, hauling, and lots            | later SPE-1027 children                                                                                     | Broader warehouse operations remain outside AC6                       |
| Consume-history or week-close auto-stamp | later SPE-1027 / SPE-2775 child                                                                             | Caller-owned snapshot only this slice                                 |
| Player command / UI                      | later SPE-1027 / topology UI child                                                                          | Domain helper only this slice                                         |
| Production starting-state seed           | later SPE-1027 child                                                                                        | Match SPE-2887 / SPE-2889 / SPE-2890 / SPE-2891 / SPE-2892 / SPE-2895 |
| SPE-1026 topology-to-stock CAD           | [SPE-1026](https://linear.app/spectranoir/issue/SPE-1026/facility-layout-strategy-and-zone-adjacency-model) | Layout graph, not this preparedness helper                            |
| SPE-877 parent reconciliation            | explicit SPE-877 parent-reconciliation slice                                                                | Do not close SPE-877                                                  |

## Acceptance

- Stamp a valid `facility_salt` snapshot and resolve it without mutating catalog inventory or `facilityStockpile`
- `quantity < reserve` or `quantity <= recentOutflow` → `stockout`; otherwise → `prepared`
- The same quantity with a different reserve or recent outflow flips the resolved outcome
- Omitted or absent preparedness → `ok`; pressure `unknown`
- Unknown stock on stamp or resolve → `invalid_stock`; original state reference returned
- Negative, non-integer, or unsafe-integer snapshot field → `invalid_snapshot`; no preparedness write
- Hydration accepts only own enumerable valid siblings, drops malformed siblings independently, and does not inherit omitted fallback preparedness
- Resolve is read-only; hydration/save-load does not re-run stamp or resolve or debit stock
- Spare-part consume stays ungated when preparedness is omitted or present
- Parent SPE-1027 remains Backlog; SPE-1052 remains Backlog; SPE-877 remains Backlog

## Validation

- Targeted Vitest: `src/test/facilityStockPreparedness.contract.test.ts`
- Targeted Vitest: `src/test/sim.validation.test.ts` (isolated after one local timeout)
- Full Vitest: `npm run test:run`
- `npm run lint`
- `npm run verify:backlog-handoff`
- Touched-file Prettier check
- `git diff --check`
