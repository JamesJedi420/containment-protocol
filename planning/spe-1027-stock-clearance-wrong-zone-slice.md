# SPE-2890 — Access-controlled storage class clearance and wrong-zone handle

| Field               | Value                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                  |
| **Linear**          | [SPE-2890](https://linear.app/spectranoir/issue/SPE-2890/access-controlled-storage-class-clearance-and-wrong-zone-handle)             |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog** |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**     |
| **Related**         | [SPE-2887](https://linear.app/spectranoir/issue/SPE-2887/named-part-facility-stockpile-consume-helper) (qty consume stays ungated)    |
| **Branch**          | `cursor/spe-1027-stock-clearance-wrong-zone-3400`                                                                                     |
| **Base `main` SHA** | `b36aec2ee743bea8cc5cc03992df3f02c20678c9`                                                                                            |

## Boundary

Ship one authored access-controlled storage class so SPE-1027’s second AC is true: cleared
staff routing to the allowed zone succeeds; uncleared staff and wrong-zone routing fail closed.

Reuse the optional-map parse/hydrate pattern from `facilityStockpile` / `departmentLocalStaging`.
Do not recode SPE-2887 `consumeFacilityStock` or SPE-2870 blast-door repair. Do not mix placement
into spare-part qty. Do not implement quarantine, hauling, capacity, spoilage, lots, emergency
caches, SPE-1026 CAD, player UI, or production starting-state seed. Do not invent catalog
`GameState.inventory` as this port. Do not bump `GAME_STORE_VERSION`. Do not close SPE-1027,
SPE-1052, or SPE-877. Do not reopen SPE-2827 / SPE-2848. Do not pick SPE-2847.

## Seam

`GameState.facilityStockPlacement` is an optional map of known storage class ids to storage zone
ids. Authored this slice: class `weapons_locker`, allowed zone `weapons_locker`, wrong zone
`mundane_supplies`, required staff clearance `2`. `parseFacilityStockPlacement` hydrates through
`runTransfer`: omit / non-record / empty after sanitize → undefined; unknown, integer-index,
prototype-unsafe, and non-enum siblings drop independently.

`handleAccessControlledStock(state, { classId, staffClearance, destinationZone })` is
caller-owned. Unknown class → `invalid_class`. Non-integer, unsafe, or below-floor clearance →
`clearance_denied`. Destination other than the allowed zone → `wrong_zone`. Success stamps
placement to the allowed zone. Catalog inventory and `facilityStockpile` are unchanged. Hydration
does not re-run handle.

## Deferred

| Item or mechanic                            | Owner or prerequisite                                                                                             | Why deferred                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| SPE-1026 topology-to-staging / zone CAD     | [SPE-1026](https://linear.app/spectranoir/issue/SPE-1026/facility-layout-strategy-and-zone-adjacency-model)       | Layout graph, not this access handle                  |
| Player command / UI to handle stock         | later SPE-1027 / topology UI child                                                                                | Domain helper only this slice                         |
| Production starting-state seed of placement | later SPE-1027 child                                                                                              | Match SPE-2887 / SPE-2889 no production seed          |
| Remaining SPE-1027 warehouse AC             | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) | Quarantine, hauling, capacity, spoilage, lots, caches |
| SPE-877 parent reconciliation               | explicit SPE-877 parent-reconciliation slice                                                                      | Do not close SPE-877                                  |

## Acceptance

- Cleared staff (`2`) + allowed zone → `ok`; placement stamped; catalog inventory and `facilityStockpile` unchanged
- Uncleared staff + allowed zone → `clearance_denied`; no placement write
- Cleared staff + `mundane_supplies` → `wrong_zone`; no placement write
- Unknown / malformed class → `invalid_class`
- Hydration/save-load does not re-run handle or debit stock
- Spare-part consume stays ungated when placement is omitted
- Parent SPE-1027 remains Backlog; SPE-1052 remains Backlog; SPE-877 remains Backlog

## Validation

- Targeted Vitest: `src/test/facilityStockAccess.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
