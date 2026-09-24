# SPE-2913 — Project facility topology into department-local staging adjacency

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                        |
| **Linear**          | [SPE-2913](https://linear.app/spectranoir/issue/SPE-2913/project-facility-topology-into-department-local-staging-adjacency)                                                 |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella) |
| **Blocked by**      | [SPE-2932](https://linear.app/spectranoir/issue/SPE-2932/authoritative-facility-section-graph-and-placement-kernel) — **Done**                                              |
| **Related**         | SPE-2889 persisted staging field and week-close 4th-arg feed; SPE-2775 throughput resolver unchanged; SPE-792 dependency edges stay distinct                                |
| **Branch**          | `cursor/spe-2913-department-local-staging-adjacency-860b`                                                                                                                   |
| **Base `main` SHA** | `443b47dcca0b2ed7f3cf2aa7511175ae47501ff7`                                                                                                                                  |

## Goal

One projector from `readProductionFacilitySectionGraph` into existing `DepartmentWorkshopStagingConditions` (`adjacent` | `remote`). Fail closed to the one-unit baseline when topology or placement is missing. Do not add a second topology store, throughput kernel, staging schema, or week-close hook.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/facilitySectionGraph.ts`; `src/domain/facilityLayoutStagingProjection.ts`; `src/domain/departmentLocalStaging.ts`; `src/domain/departmentWorkshopQueue.ts`; `src/domain/sim/advanceWeek.ts` week-close 4th arg; the two contract tests named in the task                                                    |
| Current behavior  | SPE-2932 exposes a validated section graph and placement lookup. Week-close passes parsed `GameState.departmentLocalStaging` into `processDepartmentWorkshopTick`. The seven room pairs stay caller-owned and are not applied at week-close.                                                                            |
| Expected behavior | Direct spatial adjacency between a placed department and `clinical_hold` projects `adjacent` on both axes. A placed department that is not directly adjacent projects `remote` on both axes. Unresolved topology omits the department. The week-close 4th arg is that projection. A persisted cache cannot override it. |
| Boundary          | New pure projector + contract tests + this slice doc and backlog handoff. The existing week-close call keeps its 4th-arg shape. No `SCHEMA_REGISTRY` change.                                                                                                                                                            |
| Risks             | A persisted `adjacent` value overriding missing topology; sibling departments changing; insertion order changing the projection; spatial edges collapsing into SPE-792 dependency edges.                                                                                                                                |
| Validation        | `src/test/facilitySectionStagingProjection.contract.test.ts`, then the staging contract tests, then lint, then `npm run test:run`, then `npm run verify:backlog-handoff`                                                                                                                                                |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY` change.                                                                                                                                                                                                           |

## Boundary

### In scope

- `projectFacilitySectionGraphOntoDepartmentLocalStaging` and `projectProductionFacilitySectionStaging`
- Both axes follow direct spatial adjacency to the single `clinical_hold` placement
- Fail closed: unvalidated graph, missing staging location, unplaced department, malformed topology
- Equal normalized topology projects equal staging independent of insertion order
- Week-close passes the production projection as the existing 4th argument
- Persisted `departmentLocalStaging` stays on the state for hydration compatibility and does not drive throughput

### Out of scope

- The seven `projectFacilityLayoutRoomsOntoDepartmentLocalStaging` pairs
- An eighth pair, `ethics_review` → `department:ethics-review`, or `evidence_intake` → `department:general-intake`
- `department:biohazard-response` as a placed 1-work-unit sibling; `command` as a parsed-room fixture
- A second topology store, staging schema, throughput kernel, or week-close hook
- Planner UI, SPE-1058, SPE-1606, SPE-1029
- SPE-792 dependency edges
- Separate input and output staging-location ids (the SPE-2932 catalog stays `clinical_hold` only)

## Seam

`projectProductionFacilitySectionStaging` reads `readProductionFacilitySectionGraph` and returns a `parseDepartmentLocalStaging` map. Production places `department:emergency-response` on `room:med_bay` and `clinical_hold` on `section:clinical`, which are directly adjacent, so that department is `adjacent` / `adjacent`. Every other department is omitted. `advanceWeek` still calls `processDepartmentWorkshopTick` once. The 4th argument is the projection. `resolveDepartmentWorkshopThroughput` is unchanged.

## Acceptance

- [x] Production topology projects `adjacent` / `adjacent` for `department:emergency-response`
- [x] A placed department that is not directly adjacent to `clinical_hold` projects `remote` / `remote` and does not change an unplaced sibling
- [x] Missing, forged, or rejected topology projects no staging and cannot grant adjacency throughput
- [x] Shuffled equivalent topology projects the same staging
- [x] Week-close uses that projection through the existing 4th-arg feed
- [x] A persisted `remote` cache on emergency-response still completes in two work units; a persisted `adjacent` cache on an unplaced department stays at one work unit
- [x] Week-close does not mutate the persisted cache or the authored topology, and a second week does not re-apply the emergency completion
- [x] Seven room pairs are unchanged. No new persisted field

## Deferred

| Item or mechanic                               | Owner or prerequisite                                                                                                                   | Why deferred                                                                                                                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Separate input and output staging-location ids | later SPE-1052 child after a catalog change                                                                                             | SPE-2932 closes staging locations at `clinical_hold`. Both axes share that one adjacency. A remote relationship projects `remote` on both axes together.             |
| Seven room-pair caller path                    | stays on `projectFacilityLayoutRoomsOntoDepartmentLocalStaging`                                                                         | This slice does not replace that caller. Week-close does not call it.                                                                                                |
| Eighth room-to-department staging pair         | catalog stop on SPE-1052                                                                                                                | Seven pairs stay. Do not map `ethics_review` or `evidence_intake`. `department:biohazard-response` stays unplaced. `command` stays the unmapped parsed-room fixture. |
| Facility planner UI / specialist gates         | later UI / [SPE-1058](https://linear.app/spectranoir/issue/SPE-1058/specialist-labor-task-gating-and-skill-dependent-production-system) | Domain projector only.                                                                                                                                               |
| Zone-crossing breach events                    | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                                               | No event propagation.                                                                                                                                                |
| Staff housing campaign morale                  | [SPE-1029](https://linear.app/spectranoir/issue/SPE-1029/staff-housing-recovery-and-morale-stabilization-system)                        | Out of scope.                                                                                                                                                        |
| Functional/service dependency edges            | [SPE-792](https://linear.app/spectranoir/issue/SPE-792/facility-core-dependency-graph)                                                  | Spatial edges stay `spatial_adjacency`. A dependency-class edge still fails SPE-2932 validation and projects nothing.                                                |

Parent SPE-1052 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/facilitySectionStagingProjection.contract.test.ts`
- `npm run lint`
- `npm run test:run`
- `npm run verify:backlog-handoff`
