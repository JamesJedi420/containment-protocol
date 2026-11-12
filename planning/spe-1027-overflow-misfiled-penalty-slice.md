# SPE-2895 — Authored evidence-cage overflow blocks access (parent AC5)

| Field               | Value                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                  |
| **Linear**          | [SPE-2895](https://linear.app/spectranoir/issue/SPE-2895/authored-evidence-cage-overflow-blocks-access-parent-ac5)                                                    |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog**                                 |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                                     |
| **Related**         | [SPE-2890](https://linear.app/spectranoir/issue/SPE-2890/access-controlled-storage-class-clearance-and-wrong-zone-handle) — inspect only; wrong-zone is not this port |
| **Branch**          | `cursor/spe-1027-overflow-misfiled-penalty-3400`                                                                                                                      |
| **Base `main` SHA** | `6d343de2d9d7e42356f2427a8ded91619cd2dd24`                                                                                                                            |

## Boundary

Ship one authored overflow event so SPE-1027’s fifth AC is true: recording overflow on
`evidence_cage` blocks access (`penalty: 'blocked'`); omit stays `clear`. Overflow, not misfile —
SPE-2890 already operationalizes wrong-zone routing as `wrong_zone`.

Reuse the optional-map parse/hydrate pattern from `facilityStockpile` / `facilityStockPlacement` /
`facilityStockCondition` / `facilityEmergencyCaches`. Do not recode SPE-2775, SPE-2887
`consumeFacilityStock`, SPE-2870 blast-door repair, SPE-2890 `handleAccessControlledStock`,
SPE-2891 `applyIncorrectStorageSpoilage`, or SPE-2892 cache helpers. Do not add `evidence_cage` to
SPE-2890 `STORAGE_ZONE_IDS` or SPE-2891 `SPOILAGE_ZONE_IDS`. Do not mix overflow into spare-part
qty, placement, condition, or caches. Do not compute qty-vs-capacity, implement misfile events,
typed overflow/loss, quarantine, hauling, lots, capacity-as-warehouse, SPE-1026 CAD, SPE-1473 /
SPE-1474, SPE-956 `majorIncidents.ts`, player UI, week-close auto-record, SPE-2775 feed, or
production starting-state seed. Do not invent catalog `GameState.inventory` as this port. Do not
bump `GAME_STORE_VERSION`. Do not close SPE-1027, SPE-1052, or SPE-877. Do not reopen SPE-2827 /
SPE-2848. Do not pick SPE-2847.

## Seam

`GameState.facilityStockOverflow` is an optional map of known overflow node ids (`evidence_cage`) to
status `overflowing`. `parseFacilityStockOverflow` hydrates through `runTransfer`: omit / non-record
/ empty after sanitize → undefined; unknown, integer-index, prototype-unsafe, and non-enum siblings
drop independently.

`recordFacilityOverflow(state, { nodeId })` is caller-owned. Unknown node → `invalid_node`. Success
stamps `evidence_cage` → `overflowing`. Catalog inventory and `facilityStockpile` are unchanged.

`resolveFacilityOverflowPenalty(state, { nodeId })` is read-only. Unknown node → `invalid_node`.
`evidence_cage` overflowing → `blocked`. Omit or absent → `clear`. Resolve returns the same state
reference and does not stamp penalty. Hydration does not re-run record or resolve.

## Deferred

| Item or mechanic                           | Owner or prerequisite                                                                                             | Why deferred                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Misfile events                             | later SPE-1027 child                                                                                              | SPE-2890 already covers wrong-zone handle; remaining mismatch AC |
| Typed overflow / real loss                 | later SPE-1027 child                                                                                              | Forced triage and loss are a later warehouse slice               |
| Qty-vs-capacity warehouse                  | later SPE-1027 child                                                                                              | Live capacity is not this authored event                         |
| Week-close auto-record / SPE-2775 feed     | later SPE-1027 / SPE-2775 child                                                                                   | Caller-owned helper only this slice                              |
| Player command / UI to record overflow     | later SPE-1027 / topology UI child                                                                                | Domain helper only this slice                                    |
| Production starting-state seed of overflow | later SPE-1027 child                                                                                              | Match SPE-2887 / SPE-2889 / SPE-2890 / SPE-2891 / SPE-2892       |
| SPE-1026 topology-to-overflow CAD          | [SPE-1026](https://linear.app/spectranoir/issue/SPE-1026/facility-layout-strategy-and-zone-adjacency-model)       | Layout graph, not this overflow helper                           |
| Remaining SPE-1027 warehouse AC            | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) | Quarantine, hauling, capacity, lots                              |
| SPE-877 parent reconciliation              | explicit SPE-877 parent-reconciliation slice                                                                      | Do not close SPE-877                                             |

## Acceptance

- Record `evidence_cage` overflow + resolve → `ok`; `penalty: 'blocked'`; catalog inventory and `facilityStockpile` unchanged
- Omit overflow → `ok`; `penalty: 'clear'`
- Unknown / malformed node on record → `invalid_node`; no overflow write
- Unknown / malformed node on resolve → `invalid_node`; no overflow write
- Resolve is read-only; hydration/save-load does not re-run record or resolve or debit stock
- Spare-part consume stays ungated when overflow is omitted or present
- Parent SPE-1027 remains Backlog; SPE-1052 remains Backlog; SPE-877 remains Backlog

## Validation

- Targeted Vitest: `src/test/facilityStockOverflow.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
