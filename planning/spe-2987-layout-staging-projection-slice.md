# SPE-2987 — Project room graph → SPE-2889 staging adjacent/remote

| Field               | Value                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**          | **Recently shipped**                                                                                                                             |
| **Linear**          | [SPE-2987](https://linear.app/spectranoir/issue/SPE-2987/project-room-graph-spe-2889-staging-adjacentremote)                                     |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                |
| **Predecessor**     | [SPE-2986](https://linear.app/spectranoir/issue/SPE-2986/persist-facility-layout-graph-on-gamestate) — already **Done**; do not reopen           |
| **Related**         | SPE-2889 staging persist (unchanged throughput); SPE-1026 kernel (unchanged formulas); SPE-1027 stock helpers (unchanged); SPE-2984 stays closed |
| **Branch**          | `cursor/spe-2987-layout-staging-projection-761d`                                                                                                 |
| **Base `main` SHA** | `c8885267cef20a3c83bc5038fd52eaf462e4fe85`                                                                                                       |

## Goal

Project one authored facility-layout room onto the existing caller-owned department-local
staging map. Fail closed. Do not build a CAD graph.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/facilityLayoutStrategy.ts` (`FacilityLayoutRoomRecord`, `parseFacilityLayoutSnapshot`); `src/domain/departmentLocalStaging.ts`; `src/domain/sim/advanceWeek.ts` 4th-arg staging feed only |
| Current behavior  | SPE-2986 persists `facilityLayoutSnapshot`. SPE-2889 persists `departmentLocalStaging`. No room→department projection.                                                                                |
| Expected behavior | Explicit caller step returns a new staging map. `archive` + `adjacentToCritical: true` sets `department:records-analysis` adjacent on both axes. Omit layout leaves the saved map untouched.          |
| Boundary          | One pure function + contract tests + docs. No new persisted field, no week-close writer, no kernel or throughput retune.                                                                              |
| Risks             | An unstated room catalog would be a guess. Applying the projection inside week-close would fight a saved staging map.                                                                                 |
| Validation        | `src/test/facilityLayoutStagingProjection.contract.test.ts`, staging and layout persist contracts, lint, `verify:backlog-handoff`                                                                     |
| Docs              | This slice doc; backlog handoff + manifest; SPE-2986 deferred owner pointer. No `SCHEMA_REGISTRY` change.                                                                                             |

## Boundary

### In scope

- `projectFacilityLayoutRoomsOntoDepartmentLocalStaging(layout, staging)` in `src/domain/facilityLayoutStagingProjection.ts`
- Authored rule: room `archive` with `adjacentToCritical: true` writes `department:records-analysis` to `{ inputStaging: 'adjacent', outputStaging: 'adjacent' }`
- Omit layout returns the staging argument unchanged (same reference)
- A present layout keeps other saved department entries. `false`, a missing room, an unknown room id, and an unknown department id do not insert a staging key and do not write `remote`
- Result sanitized with `parseDepartmentLocalStaging`
- Targeted tests: omit, one adjacent department (week-close still grants 2 work units), unknown / false / malformed stay at 1 work unit, hydration and week-close do not apply the projection

### Out of scope

- SPE-2986 snapshot shape and kernel metric formulas
- SPE-2889 throughput numbers and the week-close 4th-arg call shape
- SPE-1027 stock helpers
- Planner UI
- SPE-1606 zone-crossing events
- SPE-1029 morale campaign
- `departmentWorkshopFacilityMapping.ts` (safety-axis facility status)
- Full room-to-department catalog
- Week-close auto-apply
- New `GameState` field or `GAME_STORE_VERSION` bump
- Reopening SPE-2986, SPE-1026, SPE-2889, SPE-1027, or SPE-2984

## Seam

Caller passes a parsed `FacilityLayoutSnapshot` and the current `DepartmentLocalStaging`.
The function returns the next staging map. The caller may assign that map onto
`GameState.departmentLocalStaging`. `hydrateGame` and `advanceWeek` do not call it.
Week-close still reads the saved staging map as the 4th argument to SPE-2775
`processDepartmentWorkshopTick`.

## Acceptance

- [x] Omit layout → staging unchanged; an already adjacent map still grants 2 work units at week-close
- [x] One adjacent `archive` room → records-analysis both axes adjacent; week-close grants 2 work units; an unmapped sibling stays at 1
- [x] Unknown ids and `adjacentToCritical: false` stay baseline when that department has no prior entry
- [x] Hydration does not apply the projection. Week-close with a snapshot and omitted staging does not invent a staging map
- [x] Parent SPE-1052 remains Backlog

## Deferred

| Item or mechanic                         | Owner or prerequisite                                                                                            | Why deferred                                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Full room-to-department catalog          | [SPE-2988](https://linear.app/spectranoir/issue/SPE-2988/project-med-bay-onto-emergency-response-staging)        | SPE-2988 authors `med_bay` → `department:emergency-response`; remaining rooms stay deferred on that child |
| Facility planner UI / specialist gates   | later UI / SPE-1058 adjacency                                                                                    | Domain projection only                                                                                    |
| Week-close auto-apply of this projection | later SPE-1052 child                                                                                             | A second writer inside week-close would fight a saved staging map                                         |
| Zone-crossing breach event meaning       | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                        | No event propagation this slice                                                                           |
| Staff housing campaign morale system     | [SPE-1029](https://linear.app/spectranoir/issue/SPE-1029/staff-housing-recovery-and-morale-stabilization-system) | Layout-presence bump stays in the kernel                                                                  |

Parent SPE-1052 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/facilityLayoutStagingProjection.contract.test.ts`
- Regression: `src/test/departmentLocalStaging.contract.test.ts`, `src/test/facilityLayoutPersist.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
