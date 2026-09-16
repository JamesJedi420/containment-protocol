# SPE-2889 — Persist department-local staging and feed week-close workshop tick

| Field               | Value                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                        |
| **Linear**          | [SPE-2889](https://linear.app/spectranoir/issue/SPE-2889/persist-department-local-staging-and-feed-week-close-workshop-tick)                |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog**       |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**           |
| **Related**         | [SPE-2775](https://linear.app/spectranoir/issue/SPE-2775/deterministic-adjacency-sensitive-workshop-staging-throughput) (throughput kernel) |
| **Branch**          | `cursor/spe-1027-department-local-staging-persist-3400`                                                                                     |
| **Base `main` SHA** | `3d27852eae68ebef89ed90da688c8e86900a36bd`                                                                                                  |

## Boundary

Persist optional department-local input/output staging and pass it into the existing SPE-2775
week-close workshop tick so one department’s speed changes when both axes are adjacent.

Reuse `DepartmentWorkshopStaging` / `DepartmentWorkshopStagingConditions` and
`resolveDepartmentWorkshopThroughput`. Do not recode that kernel or SPE-2887
`consumeFacilityStock`. Do not mix staging into `facilityStockpile`. Do not implement SPE-1026
topology-to-staging, player UI, or remaining SPE-1027 warehouse AC (zones, quarantine, hauling,
capacity, spoilage, lots, access control). Do not seed `createStartingState()` staging or spare-part
stock. Do not invent catalog `GameState.inventory` as this port. Do not bump `GAME_STORE_VERSION`.
Do not close SPE-1027, SPE-1052, or SPE-877. Do not reopen SPE-2827 / SPE-2848. Do not pick
SPE-2847.

## Seam

`GameState.departmentLocalStaging` is an optional map of known SPE-2083 department ids to
`{ inputStaging, outputStaging }` of `'adjacent' | 'remote'`. `parseDepartmentLocalStaging` hydrates
through `runTransfer`: omit / non-record / empty after sanitize → undefined; unknown, integer-index,
prototype-unsafe, partial-axis, and `'nearby'` siblings drop independently; valid siblings insert in
code-unit order.

Production week-close passes the parsed map as the 4th argument to `processDepartmentWorkshopTick`.
Adjacent both axes → 2 work units (`adjacent_staging`) for that department. Omit, remote, mixed
axes, and dropped siblings stay the one-unit baseline. Hydration and save-load do not mutate
staging or re-apply throughput.

## Deferred

| Item or mechanic                                          | Owner or prerequisite                                                                                             | Why deferred                                                         |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| SPE-1026 topology-to-staging projection                   | [SPE-1026](https://linear.app/spectranoir/issue/SPE-1026/facility-layout-strategy-and-zone-adjacency-model)       | CAD room-graph derivation, not persisted classification              |
| Player command / UI to set staging                        | later SPE-1027 / topology UI child                                                                                | No player writer this slice                                          |
| Production starting-state seed of one adjacent department | later SPE-1027 child                                                                                              | Match SPE-2887 no production seed                                    |
| Remaining SPE-1027 warehouse AC                           | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) | Zones, quarantine, hauling, capacity, spoilage, lots, access control |
| SPE-877 parent reconciliation                             | explicit SPE-877 parent-reconciliation slice                                                                      | Do not close SPE-877                                                 |

## Acceptance

- Hydrated adjacent both axes on one known department → 2 work units at week-close for that department
- Omit, remote, mixed axes, unknown department, malformed sibling → 1 unit (baseline)
- Sibling departments without a valid entry stay baseline
- Hydration/save-load does not mutate staging or re-apply throughput
- Parent SPE-1027 remains Backlog; SPE-1052 remains Backlog; SPE-877 remains Backlog

## Validation

- Targeted Vitest: `src/test/departmentLocalStaging.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
