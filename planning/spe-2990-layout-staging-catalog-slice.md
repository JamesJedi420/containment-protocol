# SPE-2990 — Project staging_closet onto procurement-logistics staging

| Field               | Value                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**          | **Recently shipped**                                                                                                                             |
| **Linear**          | [SPE-2990](https://linear.app/spectranoir/issue/SPE-2990/project-staging-closet-onto-procurement-logistics-staging)                              |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                |
| **Predecessor**     | [SPE-2989](https://linear.app/spectranoir/issue/SPE-2989/project-armory-onto-field-containment-staging) — already **Done**; do not reopen        |
| **Related**         | SPE-2889 staging persist (unchanged throughput); SPE-1026 kernel (unchanged formulas); SPE-1027 stock helpers (unchanged); SPE-2986 stays closed |
| **Branch**          | `cursor/spe-2990-staging-closet-layout-staging-4aa5`                                                                                             |
| **Base `main` SHA** | `8153e7a17b17aca8604f3087fff2e32f165c5f89`                                                                                                       |

## Goal

Add one authored facility-layout room beside the SPE-2987 archive pair, the SPE-2988 med_bay pair, and the SPE-2989 armory pair. Fail closed. Do not build a catalog scanner.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/facilityLayoutStagingProjection.ts`; `src/test/facilityLayoutStagingProjection.contract.test.ts`; `src/domain/facilityLayoutStrategy.ts` (`FACILITY_ROOM_IDS`, `parseFacilityLayoutSnapshot`); `src/domain/departmentLocalStaging.ts` |
| Current behavior  | SPE-2987, SPE-2988, and SPE-2989 project `archive` → `department:records-analysis`, `med_bay` → `department:emergency-response`, and `armory` → `department:field-containment`. `staging_closet` parses and stays unprojected.                    |
| Expected behavior | The same function also writes `department:procurement-logistics` adjacent/adjacent when `staging_closet` is adjacent to critical. Archive, med_bay, and armory behavior stay. Omit layout still returns the saved map by reference.               |
| Boundary          | One explicit pair in the existing function + contract tests + docs. No new persisted field, no week-close writer, no kernel or throughput retune.                                                                                                 |
| Risks             | Choosing `command` would hide the unmapped-room fixture. Scanning `FACILITY_ROOM_IDS` or deriving a department id from a room name would invent departments.                                                                                      |
| Validation        | `src/test/facilityLayoutStagingProjection.contract.test.ts`, staging and layout persist contracts, lint, `verify:backlog-handoff`                                                                                                                 |
| Docs              | This slice doc; backlog handoff + manifest; SPE-2989 deferred owner pointer. No `SCHEMA_REGISTRY` change.                                                                                                                                         |

## Boundary

### In scope

- Fourth explicit pair in `projectFacilityLayoutRoomsOntoDepartmentLocalStaging`
- Authored rule: room `staging_closet` with `adjacentToCritical: true` writes `department:procurement-logistics` to `{ inputStaging: 'adjacent', outputStaging: 'adjacent' }`
- The department id is the known registry constant `department:procurement-logistics`. It is not computed from the room string
- SPE-2987 rule stays: `archive` with `adjacentToCritical: true` writes `department:records-analysis` adjacent on both axes
- SPE-2988 rule stays: `med_bay` with `adjacentToCritical: true` writes `department:emergency-response` adjacent on both axes
- SPE-2989 rule stays: `armory` with `adjacentToCritical: true` writes `department:field-containment` adjacent on both axes
- Omit layout returns the staging argument unchanged (same reference)
- A present layout keeps other saved department entries. `false`, a missing room, an unknown room id, and an unknown department id do not insert a staging key and do not write `remote`
- A false `staging_closet` flag does not clear a saved procurement-logistics entry and does not clear archive → records-analysis, med_bay → emergency-response, or armory → field-containment
- Result sanitized with `parseDepartmentLocalStaging`
- Targeted tests: all four authored rooms together (week-close grants 2 work units on each; an unmapped sibling stays at 1), staging_closet false and unmapped `command` stay baseline, hydration and week-close do not apply the projection

### Out of scope

- Remaining `FACILITY_ROOM_IDS` entries other than `archive`, `med_bay`, `armory`, and `staging_closet`: `evidence_intake`, `containment_cell`, `command`, `staff_housing`, `lounge`, `recovery`, `memorial`, `briefing`, `director_office`, `legal`, `finance`, `ethics_review`, `internal_affairs`
- SPE-2986 snapshot shape and kernel metric formulas
- SPE-2889 throughput numbers and the week-close 4th-arg call shape
- SPE-1027 stock helpers
- Planner UI
- SPE-1606 zone-crossing events
- SPE-1029 morale campaign
- `departmentWorkshopFacilityMapping.ts` (safety-axis facility status)
- Week-close auto-apply
- New `GameState` field or `GAME_STORE_VERSION` bump
- Reopening SPE-2989, SPE-2988, SPE-2987, SPE-2986, SPE-1026, SPE-2889, SPE-1027, or SPE-2984

## Seam

Caller passes a parsed `FacilityLayoutSnapshot` and the current `DepartmentLocalStaging`.
The function returns the next staging map. The caller may assign that map onto
`GameState.departmentLocalStaging`. `hydrateGame` and `advanceWeek` do not call it.
Week-close still reads the saved staging map as the 4th argument to SPE-2775
`processDepartmentWorkshopTick`.

## Acceptance

- [x] All four authored rooms project together; week-close grants 2 work units on records-analysis, emergency-response, field-containment, and procurement-logistics; an unmapped sibling stays at 1
- [x] `staging_closet` with `adjacentToCritical: false` does not insert procurement-logistics and does not write `remote`; a saved procurement-logistics entry stays; archive, med_bay, and armory `true` in the same layout still write their departments
- [x] Unmapped parsed `command` stays baseline
- [x] Omit layout returns the saved map by the same reference
- [x] Hydration does not apply the projection. Week-close with a snapshot that includes adjacent `staging_closet` and omitted staging does not invent a staging map
- [x] Parent SPE-1052 remains Backlog

## Deferred

| Item or mechanic                         | Owner or prerequisite                                                                                            | Why deferred                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Remaining room-to-department catalog     | [SPE-2992](https://linear.app/spectranoir/issue/SPE-2992/project-legal-onto-ethics-review-staging)               | SPE-2992 authors `legal` → `department:ethics-review`; remaining rooms stay deferred on that child |
| Facility planner UI / specialist gates   | later UI / SPE-1058 adjacency                                                                                    | Domain projection only                                                                             |
| Week-close auto-apply of this projection | later SPE-1052 child                                                                                             | A second writer inside week-close would fight a saved staging map                                  |
| Zone-crossing breach event meaning       | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                        | No event propagation this slice                                                                    |
| Staff housing campaign morale system     | [SPE-1029](https://linear.app/spectranoir/issue/SPE-1029/staff-housing-recovery-and-morale-stabilization-system) | Layout-presence bump stays in the kernel                                                           |

Parent SPE-1052 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/facilityLayoutStagingProjection.contract.test.ts`
- Regression: `src/test/departmentLocalStaging.contract.test.ts`, `src/test/facilityLayoutPersist.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
