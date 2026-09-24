# SPE-2998 — Split input and output staging locations on the facility section graph

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                        |
| **Linear**          | [SPE-2998](https://linear.app/spectranoir/issue/SPE-2998/split-input-and-output-staging-locations-on-the-facility-section-graph)                                            |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella) |
| **Related**         | SPE-2932 catalog and production graph; SPE-2913 projector and week-close 4th-arg feed; SPE-2889 persisted field shape; SPE-2775 throughput resolver unchanged               |
| **Branch**          | `cursor/spe-2998-split-input-output-staging-caac`                                                                                                                           |
| **Base `main` SHA** | `2a0fdab13936ceb54a59137c41a05c76164c252a`                                                                                                                                  |

## Goal

`clinical_input_hold` and `clinical_output_hold` are independent placements. The existing projector sets `inputStaging` and `outputStaging` from those placements. A missing axis omits that axis and stays on the one-unit baseline.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/facilitySectionGraph.ts`; `src/domain/facilitySectionStagingProjection.ts`; `src/domain/sim/advanceWeek.ts` 4th arg; the three contract tests named in the task                               |
| Current behavior  | SPE-2913 classifies both axes from direct spatial adjacency to one `clinical_hold` placement. Production projects `department:emergency-response` adjacent/adjacent.                                      |
| Expected behavior | Each axis follows its own placement. Production stays adjacent/adjacent because both new places sit next to `room:med_bay`. One remote axis does not flip the other. A missing axis drops the department. |
| Boundary          | Catalog extension, two production placements, the existing projector, contract tests, this slice doc, and backlog handoff. No `SCHEMA_REGISTRY` change.                                                   |
| Risks             | A persisted `adjacent` value filling a missing axis; a sibling changing; insertion order changing the projection; spatial edges collapsing into SPE-792 dependency edges.                                 |
| Validation        | `src/test/facilitySectionStagingProjection.contract.test.ts`, then the graph and department-local staging contracts, then lint, then `npm run test:run`, then `npm run verify:backlog-handoff`            |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. SPE-2913 deferred row names this issue. No `SCHEMA_REGISTRY` change.                                                     |

## Boundary

### In scope

- Catalog ids `clinical_input_hold` and `clinical_output_hold`. `clinical_hold` stays in the catalog and on the production graph, and does not classify either axis
- Production places input on `section:clinical` and output on `room:containment_cell`. Both are directly adjacent to `room:med_bay`
- `projectFacilitySectionGraphOntoDepartmentLocalStaging` sets each axis from its own placement
- Missing axis placement omits that axis. The incomplete department is dropped
- Shuffled equivalent topology projects the same staging
- Week-close still passes `projectProductionFacilitySectionStaging()` as the existing 4th argument

### Out of scope

- The seven `projectFacilityLayoutRoomsOntoDepartmentLocalStaging` pairs
- An eighth pair, `ethics_review` → `department:ethics-review`, or `evidence_intake` → `department:general-intake`
- `department:biohazard-response` as a placed 1-work-unit sibling; `command` as a parsed-room fixture
- A second topology store, staging schema, throughput kernel, or week-close hook
- Planner UI, SPE-1058, SPE-1606, SPE-1029
- SPE-792 dependency edges
- Reopening SPE-2913, SPE-2932, SPE-2889, or SPE-2775

## Seam

`projectProductionFacilitySectionStaging` reads `readProductionFacilitySectionGraph`. Input adjacency is `clinical_input_hold` on `section:clinical`. Output adjacency is `clinical_output_hold` on `room:containment_cell`. `department:emergency-response` on `room:med_bay` is adjacent to both, so production stays `adjacent` / `adjacent`. `advanceWeek` still calls `processDepartmentWorkshopTick` once. The 4th argument is that projection. `resolveDepartmentWorkshopThroughput` is unchanged.

## Acceptance

- [x] Production topology projects `adjacent` / `adjacent` for `department:emergency-response` from the two placements
- [x] One axis can be `remote` while the other is `adjacent`. Unplaced siblings stay omitted
- [x] A placed department that is adjacent to neither staging location projects `remote` / `remote`
- [x] A missing axis placement omits that axis and cannot grant adjacency throughput. `clinical_hold` alone does not fill the missing axis
- [x] Shuffled equivalent topology projects the same staging
- [x] Week-close uses that projection through the existing 4th-arg feed. A persisted cache cannot override it
- [x] Seven room pairs are unchanged. No new persisted field

## Deferred

| Item or mechanic                       | Owner or prerequisite                                                                                                                   | Why deferred                                                                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seven room-pair caller path            | stays on `projectFacilityLayoutRoomsOntoDepartmentLocalStaging`                                                                         | This slice does not replace that caller. Week-close does not call it.                                                                                                |
| Eighth room-to-department staging pair | catalog stop on SPE-1052                                                                                                                | Seven pairs stay. Do not map `ethics_review` or `evidence_intake`. `department:biohazard-response` stays unplaced. `command` stays the unmapped parsed-room fixture. |
| Facility planner UI / specialist gates | later UI / [SPE-1058](https://linear.app/spectranoir/issue/SPE-1058/specialist-labor-task-gating-and-skill-dependent-production-system) | Domain projector only.                                                                                                                                               |
| Zone-crossing breach events            | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                                               | No event propagation.                                                                                                                                                |
| Staff housing campaign morale          | [SPE-1029](https://linear.app/spectranoir/issue/SPE-1029/staff-housing-recovery-and-morale-stabilization-system)                        | Out of scope.                                                                                                                                                        |
| Functional/service dependency edges    | [SPE-792](https://linear.app/spectranoir/issue/SPE-792/facility-core-dependency-graph)                                                  | Spatial edges stay `spatial_adjacency`. A dependency-class edge still fails SPE-2932 validation and projects nothing.                                                |

Parent SPE-1052 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/facilitySectionStagingProjection.contract.test.ts`
- `npm run lint`
- `npm run test:run`
- `npm run verify:backlog-handoff`
