# SPE-2932 — Authoritative facility section graph and placement kernel

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                        |
| **Linear**          | [SPE-2932](https://linear.app/spectranoir/issue/SPE-2932/authoritative-facility-section-graph-and-placement-kernel)                                                         |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog** (this child does not finish the umbrella) |
| **Blocks**          | [SPE-2913](https://linear.app/spectranoir/issue/SPE-2913/project-facility-topology-into-department-local-staging-adjacency) stays **Backlog**                               |
| **Related**         | SPE-1026 layout parse/resolve and closed `FACILITY_ROOM_IDS`; SPE-2889 persisted staging; SPE-2775 throughput; SPE-792 dependency edges stay distinct                       |
| **Branch**          | `cursor/spe-2932-facility-section-graph-a70e`                                                                                                                               |
| **Base `main` SHA** | `8fa884cbf9f850d7a4eef74a5675a4b646840f92`                                                                                                                                  |

## Goal

One production-authoritative spatial read path: stable node ids, bounded node classification, deterministic adjacency edges, department/staging-location placement lookup, and fail-closed validation. SPE-2913 stays blocked until it consumes this path in a later slice.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/facilityLayoutStrategy.ts` (`FACILITY_ZONE_IDS`, `FACILITY_ROOM_IDS`, parse/resolve); `src/domain/facilityLayoutStagingProjection.ts` (seven pairs); `src/domain/departmentLocalStaging.ts`; no `facilitySectionGraph` module in `src/domain` or `planning` |
| Current behavior  | SPE-1026 normalizes zone-adjacency edges and room records. SPE-2987–SPE-2997 project seven rooms onto workshop staging. Nothing exposes a section graph, spatial-node classification, or department/staging-location placement lookup.                                  |
| Expected behavior | Immutable authored topology validates, normalizes independent of insertion order, and answers node lookup, direct spatial adjacency, and placement lookup. Duplicate nodes, dangling edges, and unknown placements fail closed and grant no adjacency.                  |
| Boundary          | New pure module + contract tests + this slice doc and backlog handoff. No GameState field. No change to the seven staging pairs. No workshop `adjacent`/`remote` classification.                                                                                        |
| Risks             | A second persisted topology store; smuggling SPE-792 dependency edges; classifying workshop staging; reopening the room catalog or adding an eighth staging pair.                                                                                                       |
| Validation        | `src/test/facilitySectionGraph.contract.test.ts`, then lint, then `npm run test:run`, then `npm run verify:backlog-handoff`                                                                                                                                             |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY` change.                                                                                                                                                           |

## Boundary

### In scope

- Stable node ids: `zone:<FacilityZoneId>`, `section:<FacilitySectionId>`, `room:<FacilityRoomId>`
- Bounded classification: `zone` | `section` | `room`
- Closed section catalog `clinical` and closed staging-location catalog `clinical_hold` (not workshop `adjacent` or `remote`)
- Department placement ids are the existing eight department registry ids. Production places only `department:emergency-response`
- Deterministic undirected spatial edges stamped `spatial_adjacency`
- Placement lookup for one department and one staging location on the production graph
- Fail closed: duplicate node ids, dangling edges, unknown placements, dependency-class edges, and malformed input reject the whole topology
- Equivalent topology normalizes independent of insertion order
- One read path: `readProductionFacilitySectionGraph`

### Out of scope

- `projectFacilityLayoutRoomsOntoDepartmentLocalStaging` and the seven pairs
- An eighth pair, `ethics_review` → `department:ethics-review`, or `evidence_intake` → `department:general-intake`
- Classifying workshop staging as `adjacent` or `remote`
- SPE-2913 projection into `DepartmentWorkshopStagingConditions`
- Week-close auto-apply, planner UI, SPE-1058, SPE-1606, SPE-1029
- SPE-792 dependency edges, SPE-1240 architecture, SPE-1467 capacity, SPE-992 hidden rooms, SPE-292 zoning, SPE-1027 logistics
- A second persisted topology store or `SCHEMA_REGISTRY` / `GAME_STORE_VERSION` change

## Seam

`src/domain/facilitySectionGraph.ts` is immutable authored config. `readProductionFacilitySectionGraph` returns the normalized production graph. `validateFacilitySectionTopology` rejects a bad payload. Queries on a rejected payload return no node and no adjacency. Hydration and week-close do not call this module. SPE-2889 still owns `GameState.departmentLocalStaging`.

## Acceptance

- [x] Production facility exposes stable spatial-node ids through `readProductionFacilitySectionGraph`
- [x] Nodes classify as zone, section, or room and place `department:emergency-response` and `clinical_hold` without workshop `adjacent`/`remote`
- [x] Direct adjacency query is true for the authored med bay / containment cell edge and false for a non-edge
- [x] Department and staging-location lookup resolve to those nodes
- [x] Duplicate node ids, dangling edges, unknown placements, and malformed topology fail validation and do not grant adjacency
- [x] Shuffled equivalent topology normalizes to the same nodes, edges, and placements
- [x] Edges are `spatial_adjacency`. A dependency-class edge fails closed
- [x] No new GameState field. `FACILITY_ROOM_IDS` stays the closed 17-id catalog
- [x] Seven staging pairs are unchanged. SPE-2913 is not implemented

## Deferred

| Item or mechanic                                                     | Owner or prerequisite                                                                                                                   | Why deferred                                                                                                                                                                                                           |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project this graph into department-local staging `adjacent`/`remote` | [SPE-2913](https://linear.app/spectranoir/issue/SPE-2913/project-facility-topology-into-department-local-staging-adjacency)             | This slice is the spatial authority only. It must not classify workshop staging.                                                                                                                                       |
| Week-close auto-apply of layout or topology                          | later SPE-1052 child                                                                                                                    | A second writer inside week-close would fight saved SPE-2889 staging.                                                                                                                                                  |
| Facility planner UI / specialist gates                               | later UI / [SPE-1058](https://linear.app/spectranoir/issue/SPE-1058/specialist-labor-task-gating-and-skill-dependent-production-system) | Domain kernel only.                                                                                                                                                                                                    |
| Eighth room-to-department staging pair                               | catalog stop on SPE-1052                                                                                                                | Seven pairs stay. Do not map `ethics_review` or `evidence_intake` onto those department ids. `department:biohazard-response` stays the unmapped 1-work-unit sibling. `command` stays the unmapped parsed-room fixture. |
| Zone-crossing breach events                                          | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                                               | No event propagation.                                                                                                                                                                                                  |
| Staff housing campaign morale                                        | [SPE-1029](https://linear.app/spectranoir/issue/SPE-1029/staff-housing-recovery-and-morale-stabilization-system)                        | Layout-presence bump stays in the SPE-1026 kernel.                                                                                                                                                                     |
| Functional/service dependency edges                                  | [SPE-792](https://linear.app/spectranoir/issue/SPE-792/facility-core-dependency-graph)                                                  | Spatial edges stay `spatial_adjacency`.                                                                                                                                                                                |

Parent SPE-1052 remains **Backlog**. SPE-2913 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/facilitySectionGraph.contract.test.ts`
- `npm run lint`
- `npm run test:run`
- `npm run verify:backlog-handoff`
