# SPE-2988 — Project med_bay onto emergency-response staging

| Field               | Value                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**          | **Recently shipped**                                                                                                                             |
| **Linear**          | [SPE-2988](https://linear.app/spectranoir/issue/SPE-2988/project-med-bay-onto-emergency-response-staging)                                        |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                |
| **Predecessor**     | [SPE-2987](https://linear.app/spectranoir/issue/SPE-2987/project-room-graph-spe-2889-staging-adjacentremote) — already **Done**; do not reopen   |
| **Related**         | SPE-2889 staging persist (unchanged throughput); SPE-1026 kernel (unchanged formulas); SPE-1027 stock helpers (unchanged); SPE-2986 stays closed |
| **Branch**          | `cursor/spe-2988-med-bay-layout-staging-82a6`                                                                                                    |
| **Base `main` SHA** | `c929ba86cc3de7fcac0ee6fe58fe65104009e713`                                                                                                       |

## Goal

Add one authored facility-layout room beside the SPE-2987 archive pair. Fail closed. Do not build a catalog scanner.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/facilityLayoutStagingProjection.ts`; `src/test/facilityLayoutStagingProjection.contract.test.ts`; `src/domain/facilityLayoutStrategy.ts` (`FACILITY_ROOM_IDS`, `parseFacilityLayoutSnapshot`); `src/domain/departmentLocalStaging.ts` |
| Current behavior  | SPE-2987 projects only `archive` + `adjacentToCritical: true` onto `department:records-analysis`. `med_bay` parses and stays unprojected.                                                                                                         |
| Expected behavior | The same function also writes `department:emergency-response` adjacent/adjacent when `med_bay` is adjacent to critical. Archive behavior stays. Omit layout still returns the saved map by reference.                                             |
| Boundary          | One explicit pair in the existing function + contract tests + docs. No new persisted field, no week-close writer, no kernel or throughput retune.                                                                                                 |
| Risks             | Treating `med_bay` as the unknown-room fixture would hide the new pair. Scanning `FACILITY_ROOM_IDS` would invent departments.                                                                                                                    |
| Validation        | `src/test/facilityLayoutStagingProjection.contract.test.ts`, staging and layout persist contracts, lint, `verify:backlog-handoff`                                                                                                                 |
| Docs              | This slice doc; backlog handoff + manifest; SPE-2987 deferred owner pointer. No `SCHEMA_REGISTRY` change.                                                                                                                                         |

## Boundary

### In scope

- Second explicit pair in `projectFacilityLayoutRoomsOntoDepartmentLocalStaging`
- Authored rule: room `med_bay` with `adjacentToCritical: true` writes `department:emergency-response` to `{ inputStaging: 'adjacent', outputStaging: 'adjacent' }`
- SPE-2987 rule stays: `archive` with `adjacentToCritical: true` writes `department:records-analysis` adjacent on both axes
- Omit layout returns the staging argument unchanged (same reference)
- A present layout keeps other saved department entries. `false`, a missing room, an unknown room id, and an unknown department id do not insert a staging key and do not write `remote`
- A false `med_bay` flag does not clear a saved emergency-response entry and does not clear archive → records-analysis
- Result sanitized with `parseDepartmentLocalStaging`
- Targeted tests: both authored rooms together (week-close grants 2 work units on each; an unmapped sibling stays at 1), med_bay false and unmapped `armory` stay baseline, hydration and week-close do not apply the projection

### Out of scope

- Remaining `FACILITY_ROOM_IDS` entries other than `archive` and `med_bay`
- SPE-2986 snapshot shape and kernel metric formulas
- SPE-2889 throughput numbers and the week-close 4th-arg call shape
- SPE-1027 stock helpers
- Planner UI
- SPE-1606 zone-crossing events
- SPE-1029 morale campaign
- `departmentWorkshopFacilityMapping.ts` (safety-axis facility status)
- Week-close auto-apply
- New `GameState` field or `GAME_STORE_VERSION` bump
- Reopening SPE-2987, SPE-2986, SPE-1026, SPE-2889, SPE-1027, or SPE-2984

## Seam

Caller passes a parsed `FacilityLayoutSnapshot` and the current `DepartmentLocalStaging`.
The function returns the next staging map. The caller may assign that map onto
`GameState.departmentLocalStaging`. `hydrateGame` and `advanceWeek` do not call it.
Week-close still reads the saved staging map as the 4th argument to SPE-2775
`processDepartmentWorkshopTick`.

## Acceptance

- [x] Both authored rooms project together; week-close grants 2 work units on records-analysis and emergency-response; an unmapped sibling stays at 1
- [x] `med_bay` with `adjacentToCritical: false` does not insert emergency-response and does not write `remote`; a saved emergency-response entry stays; archive `true` in the same layout still writes records-analysis
- [x] Unmapped parsed `armory` stays baseline
- [x] Omit layout returns the saved map by the same reference
- [x] Hydration does not apply the projection. Week-close with a snapshot that includes adjacent `med_bay` and omitted staging does not invent a staging map
- [x] Parent SPE-1052 remains Backlog

## Deferred

| Item or mechanic                         | Owner or prerequisite                                                                                            | Why deferred                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Remaining room-to-department catalog     | [SPE-2989](https://linear.app/spectranoir/issue/SPE-2989/project-armory-onto-field-containment-staging)          | SPE-2989 authors `armory` → `department:field-containment`; remaining rooms stay deferred on that child |
| Facility planner UI / specialist gates   | later UI / SPE-1058 adjacency                                                                                    | Domain projection only                                                                                  |
| Week-close auto-apply of this projection | later SPE-1052 child                                                                                             | A second writer inside week-close would fight a saved staging map                                       |
| Zone-crossing breach event meaning       | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                        | No event propagation this slice                                                                         |
| Staff housing campaign morale system     | [SPE-1029](https://linear.app/spectranoir/issue/SPE-1029/staff-housing-recovery-and-morale-stabilization-system) | Layout-presence bump stays in the kernel                                                                |

Parent SPE-1052 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/facilityLayoutStagingProjection.contract.test.ts`
- Regression: `src/test/departmentLocalStaging.contract.test.ts`, `src/test/facilityLayoutPersist.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
