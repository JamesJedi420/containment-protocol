# SPE-2994 — Propagate site events over authoritative facility topology

| Field               | Value                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                        |
| **Linear**          | [SPE-2994](https://linear.app/spectranoir/issue/SPE-2994/propagate-site-events-over-authoritative-facility-topology)                                                         |
| **Parent**          | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — stays **Backlog** (this child does not finish the umbrella)                     |
| **Prerequisite**    | [SPE-2932](https://linear.app/spectranoir/issue/SPE-2932/authoritative-facility-section-graph-and-placement-kernel) — consume `readProductionFacilitySectionGraph` only      |
| **Branch**          | `cursor/spe-2994-site-event-topology-propagation-50b0`                                                                                                                       |
| **Base `main` SHA** | `3c44e80b1f9a48ce63d6b62ecdc147f9598e5b2d`                                                                                                                                  |

## Goal

One bounded site event starts at an authored facility node and spreads only across valid SPE-2932 `spatial_adjacency` edges. The result names the origin, the traversed edges, the affected nodes, and a bounded failure reason.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/facilitySectionGraph.ts`; `src/test/facilitySectionGraph.contract.test.ts`; no SPE-1606 site-event propagator in `src/domain`                                                               |
| Current behavior  | Production topology validates and answers direct adjacency. Nothing walks that graph for a site event. SPE-956 propagation graphs are a separate persisted hazard system.                             |
| Expected behavior | One pure function resolves a bounded event from a stable node id. Open `spatial_adjacency` edges spread in canonical edge order. Inaccessible, removed, and invalid edges do not spread. Failures leave caller state unchanged. |
| Boundary          | New pure module, contract tests, this slice doc, and backlog handoff. No GameState field. No second spatial graph.                                                                                      |
| Risks             | Treating SPE-956 graphs or SPE-1026 route kinds as the facility walk. Mutating caller affected lists on failure. Authoring adjacency beside the validated graph.                                       |
| Validation        | `src/test/siteEventTopologyPropagation.contract.test.ts`, `src/test/facilitySectionGraph.contract.test.ts`, lint, `npm run test:run`, `npm run verify:backlog-handoff`                                 |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`; SPE-2932 deferred row points here for the bounded walk. No `SCHEMA_REGISTRY` change.                                  |

## Boundary

### In scope

- `propagateSiteEventOverFacilityTopology` reads production topology or validates an authored payload with `validateFacilitySectionTopology`
- Steps call `lookupSpatialNode` and `queryDirectSpatialAdjacency`
- Edge class stays `spatial_adjacency`
- Hop bound `maxHops`; zero stays on the origin
- Optional raw edge `access`: `open`, `inaccessible`, or `removed`. Missing access is open
- Deterministic discovery follows normalized edge order
- Fail closed: missing topology, graph rejection, malformed edge access, missing or unknown origin, invalid bound
- Failure returns an empty affected list and does not write `affectedNodeIds`

### Out of scope

- SPE-2932 / SPE-1026 topology mutation, section catalogs, and placement
- SPE-1606 origin rules, recurrence, site-wide escalation, and affected-zone state beyond this one walk
- Actor movement, pathfinding, patrol, and route-control simulation
- Map discovery and hidden-route knowledge
- Trail evidence and forensic reconstruction (SPE-606 / SPE-1612)
- Calendar activation (SPE-646 / SPE-1071)
- Hazard behavior, UI, persistence, `SCHEMA_REGISTRY`, and SPE-956 propagation graphs

## Seam

`src/domain/siteEventTopologyPropagation.ts` is pure. Production reads `readProductionFacilitySectionGraph`. Authored payloads must validate before any hop. Caller adjacency is not an input. Hydration and week-close do not call this module.

## Acceptance

- [x] A site event starts at `section:clinical` and reaches `room:med_bay` and `zone:medical` on the production graph
- [x] A non-edge in caller data does not spread when production topology is the source
- [x] An `inaccessible` edge and a removed edge do not spread
- [x] Missing topology, a dangling edge, and malformed edge access fail closed without mutating caller `affectedNodeIds`
- [x] The result exposes origin, traversed edges, affected nodes, blocked edges, and `failureReason`
- [x] Reversed insertion order yields the same affected sequence
- [x] No new GameState field and no SPE-956 graph change

## Deferred

| Item or mechanic                                      | Owner or prerequisite                                                                                      | Why deferred                                                                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Event origin rules, recurrence, and affected-zone state | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                 | This slice is one bounded walk. It does not pulse, recur, or cover the whole site.                   |
| Airflow, visibility, panic, alarm, and contamination spread | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)             | Those families are not `spatial_adjacency` edges on the facility graph.                              |
| Facility topology mutation and placement              | [SPE-2932](https://linear.app/spectranoir/issue/SPE-2932/authoritative-facility-section-graph-and-placement-kernel) | This slice only reads a validated graph.                                                       |
| Route-kind traversal cost                             | [SPE-1026](https://linear.app/spectranoir/issue/SPE-1026/facility-layout-strategy-and-zone-adjacency-model) | Route burdens are not facility section edges.                                                         |
| Actor movement and pathfinding                        | existing movement owners                                                                                   | No patrol or route-control simulation.                                                                |
| Map discovery and hidden routes                       | existing map/knowledge owners                                                                              | No player-visible route knowledge.                                                                    |
| Trail evidence and residue                            | [SPE-606](https://linear.app/spectranoir/issue/SPE-606/layered-tracking-and-trail-forensics) / [SPE-1612](https://linear.app/spectranoir/issue/SPE-1612/environmental-route-mark-clues) | No forensic reconstruction.                                                              |
| Calendar activation                                   | [SPE-646](https://linear.app/spectranoir/issue/SPE-646/calendar-bound-anomaly-windows) / [SPE-1071](https://linear.app/spectranoir/issue/SPE-1071/calendar-seasonal-cycle-and-time-gated-events) | No scheduling.                                                                 |
| Hazardous-content propagation graphs                  | SPE-956 / `src/domain/spe956PropagationGraphPersistence.ts`                                                | Different system. Do not extend it onto facility sections.                                           |

Parent SPE-1606 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/siteEventTopologyPropagation.contract.test.ts`
- Regression: `src/test/facilitySectionGraph.contract.test.ts`
- `npm run lint`
- `npm run test:run`
- `npm run verify:backlog-handoff`
