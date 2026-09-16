# SPE-2892 — Emergency cache improves live-incident response timing

| Field               | Value                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                                                    |
| **Linear**          | [SPE-2892](https://linear.app/spectranoir/issue/SPE-2892/emergency-cache-improves-live-incident-response-timing)                                                                                        |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog**                                                                   |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                                                                       |
| **Related**         | [SPE-1473](https://linear.app/spectranoir/issue/SPE-1473/operational-supply-cache) / [SPE-1474](https://linear.app/spectranoir/issue/SPE-1474/emergency-backstock-checks) — inspect only; not this port |
| **Branch**          | `cursor/spe-1027-emergency-cache-response-3400`                                                                                                                                                         |
| **Base `main` SHA** | `cb2081e802616d43f10abfc74e756928d25d1974`                                                                                                                                                              |

## Boundary

Ship one authored emergency cache so SPE-1027’s fourth AC is true: staging `salt_cache` at
`containment_danger_zone` improves `containment_breach` response timing; omit or
`remote_storage` stays `delayed`.

Reuse the optional-map parse/hydrate pattern from `facilityStockpile` / `facilityStockPlacement` /
`facilityStockCondition`. Do not recode SPE-2775, SPE-2887 `consumeFacilityStock`, SPE-2870
blast-door repair, SPE-2890 `handleAccessControlledStock`, or SPE-2891
`applyIncorrectStorageSpoilage`. Do not add `containment_danger_zone` or `remote_storage` to
SPE-2890 `STORAGE_ZONE_IDS` or SPE-2891 `SPOILAGE_ZONE_IDS`. Do not mix caches into spare-part
qty, placement, or condition. Do not implement SPE-1473 portable caches, SPE-1474 backstock
search, SPE-956 `responseTiming`, `majorIncidents.ts` flavor, quarantine, hauling, capacity, lots,
SPE-1026 CAD, player UI, week-close auto-resolve, or production starting-state seed. Do not invent
catalog `GameState.inventory` as this port. Do not bump `GAME_STORE_VERSION`. Do not close
SPE-1027, SPE-1052, or SPE-877. Do not reopen SPE-2827 / SPE-2848. Do not pick SPE-2847.

## Seam

`GameState.facilityEmergencyCaches` is an optional map of known cache ids (`salt_cache`) to cache
zone ids (`containment_danger_zone` / `remote_storage`). `parseFacilityEmergencyCaches` hydrates
through `runTransfer`: omit / non-record / empty after sanitize → undefined; unknown,
integer-index, prototype-unsafe, and non-enum siblings drop independently.

`stageFacilityEmergencyCache(state, { cacheId, zoneId })` is caller-owned. Unknown cache →
`invalid_cache`. Zone other than `containment_danger_zone` or `remote_storage` → `invalid_zone`.
Danger and remote are both legal stage destinations. Success stamps the cache zone. Catalog
inventory and `facilityStockpile` are unchanged.

`resolveLiveIncidentResponse(state, { incidentId })` is read-only. Unknown incident →
`invalid_incident`. `salt_cache` at `containment_danger_zone` for `containment_breach` →
`improved`. Omit, absent, or `remote_storage` → `delayed`. Resolve returns the same state
reference and does not stamp timing. Hydration does not re-run stage or resolve.

## Deferred

| Item or mechanic                           | Owner or prerequisite                                                                                             | Why deferred                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| SPE-1026 topology-to-cache / zone CAD      | [SPE-1026](https://linear.app/spectranoir/issue/SPE-1026/facility-layout-strategy-and-zone-adjacency-model)       | Layout graph, not this cache helper                                |
| Player command / UI to stage caches        | later SPE-1027 / topology UI child                                                                                | Domain helper only this slice                                      |
| Production starting-state seed of caches   | later SPE-1027 child                                                                                              | Match SPE-2887 / SPE-2889 / SPE-2890 / SPE-2891 no production seed |
| SPE-1473 portable operational supply cache | [SPE-1473](https://linear.app/spectranoir/issue/SPE-1473/operational-supply-cache)                                | Different umbrella (Equipment/Loadouts)                            |
| SPE-1474 emergency backstock search        | [SPE-1474](https://linear.app/spectranoir/issue/SPE-1474/emergency-backstock-checks)                              | Different umbrella (Economy/Procurement)                           |
| Remaining SPE-1027 warehouse AC            | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) | Quarantine, hauling, capacity, lots                                |
| SPE-877 parent reconciliation              | explicit SPE-877 parent-reconciliation slice                                                                      | Do not close SPE-877                                               |

## Acceptance

- `salt_cache` + `containment_danger_zone` + `containment_breach` → `ok`; `timing: 'improved'`; catalog inventory and `facilityStockpile` unchanged
- Omit caches, or `salt_cache` at `remote_storage` → `ok`; `timing: 'delayed'`
- Unknown / malformed incident → `invalid_incident`; no cache write
- Unknown cache on stage → `invalid_cache`; no cache write
- Unknown zone on stage → `invalid_zone`; no cache write
- Resolve is read-only; hydration/save-load does not re-run stage or resolve or debit stock
- Spare-part consume stays ungated when caches are omitted or present
- Parent SPE-1027 remains Backlog; SPE-1052 remains Backlog; SPE-877 remains Backlog

## Validation

- Targeted Vitest: `src/test/facilityEmergencyCache.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
