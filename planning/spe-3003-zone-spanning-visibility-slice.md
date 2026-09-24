# SPE-3003 — Spread one zone-spanning event by visibility

| Field               | Value                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                    |
| **Linear**          | [SPE-3003](https://linear.app/spectranoir/issue/SPE-3003/spread-one-zone-spanning-event-by-visibility)                                                  |
| **Parent**          | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — stays **Backlog** (this child does not finish the umbrella) |
| **Prerequisite**    | [SPE-3002](https://linear.app/spectranoir/issue/SPE-3002/spread-one-zone-spanning-event-by-airflow) — existing record and airflow rule only             |
| **Branch**          | `cursor/spe-3003-zone-spanning-visibility-6c37`                                                                                                         |
| **Base `main` SHA** | `5323afcfe1e5321461854f31b8f419ef460dd70d`                                                                                                              |

## Goal

One additional rule id on the existing zone-spanning record. Visibility resolves only from pairs the facility graph already has as `spatial_adjacency` edges. A missing visibility source fails closed and does not write affected ids.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Relevant files    | `src/domain/zoneSpanningSiteEvent.ts`; `src/test/zoneSpanningSiteEvent.contract.test.ts`; `src/domain/siteEventTopologyPropagation.ts`; `src/domain/facilitySectionGraph.ts`   |
| Current behavior  | SPE-3002 applies `airflow` beside `spatial_adjacency`. The production graph has no visibility field. SPE-2932 rejects a non-adjacency edge class.                              |
| Expected behavior | `applyZoneSpanningVisibility` writes affected ids, origin removed, only along existing edges named by an optional `visibility` list. A missing source returns the same record. |
| Boundary          | One rule id, contract tests, this slice doc, and backlog handoff. No new edge class. No production topology edit. No airflow behavior change.                                  |
| Risks             | Treating a missing source as an adjacency or airflow write. Inventing an edge for a pair the graph does not already have.                                                      |
| Validation        | `src/test/zoneSpanningSiteEvent.contract.test.ts`, lint, `npm run test:run`, `npm run verify:backlog-handoff`                                                                  |
| Docs              | This slice doc; `planning/spe-3002-zone-spanning-airflow-slice.md` deferred row; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY` change. |

## Boundary

### In scope

- Rule id `visibility` beside `airflow` and `spatial_adjacency`
- `applyZoneSpanningVisibility` reads an optional `visibility` list of `{ fromNodeId, toNodeId }` on an authored topology
- A pair counts only when `queryDirectSpatialAdjacency` already reports that edge
- Success stores reached ids with the origin removed, in canonical edge order
- A missing source (production read, omitted list, malformed list, or no pair that is already an edge) returns the input record
- `propagateSiteEventOverFacilityTopology` validates topology and origin. Its adjacency result is not copied, and the airflow result is not copied, when the visibility lookup fails

### Out of scope

- SPE-3002 airflow behavior and SPE-3001 pulse cadence
- SPE-2932 topology contents and SPE-2994 walk behavior
- Panic, alarm, and contamination spread
- Route burdens, actor movement, map discovery, trail evidence, and calendar activation
- SPE-956 propagation graphs, persistence, `SCHEMA_REGISTRY`, UI, and week-close registration

## Seam

`applyZoneSpanningVisibility` is pure. It does not author edges. The production graph has no visibility source, so a production read returns the same record. Hydration and week-close do not call this function.

## Acceptance

- [x] An authored visibility list of existing edges leaves the origin off the affected list
- [x] A missing visibility source keeps the affected array reference
- [x] A pair that is not an existing spatial edge does not add that node
- [x] Airflow, adjacency, and the SPE-3001 pulse stay unchanged
- [x] No new GameState field and no SPE-2932 edge class

## Deferred

| Item or mechanic                         | Owner or prerequisite                                                                                                                                                                            | Why deferred                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Panic spread                             | [SPE-3004](https://linear.app/spectranoir/issue/SPE-3004/spread-one-zone-spanning-event-by-panic)                                                                                                | One rule id on the zone-spanning record. This slice stays visibility. |
| Alarm spread                             | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                                                                                                        | Alarm routing is not this visibility rule.                            |
| Contamination spread                     | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                                                                                                        | Contamination is not this visibility rule.                            |
| Facility topology mutation and placement | [SPE-2932](https://linear.app/spectranoir/issue/SPE-2932/authoritative-facility-section-graph-and-placement-kernel)                                                                              | This slice only reads a validated graph.                              |
| Route-kind traversal cost                | [SPE-1026](https://linear.app/spectranoir/issue/SPE-1026/facility-layout-strategy-and-zone-adjacency-model)                                                                                      | Route burdens are not facility section edges.                         |
| Actor movement and pathfinding           | existing movement owners                                                                                                                                                                         | No patrol or route-control simulation.                                |
| Map discovery and hidden routes          | existing map/knowledge owners                                                                                                                                                                    | No player-visible route knowledge.                                    |
| Trail evidence and residue               | [SPE-606](https://linear.app/spectranoir/issue/SPE-606/layered-tracking-and-trail-forensics) / [SPE-1612](https://linear.app/spectranoir/issue/SPE-1612/environmental-route-mark-clues)          | No forensic reconstruction.                                           |
| Calendar activation                      | [SPE-646](https://linear.app/spectranoir/issue/SPE-646/calendar-bound-anomaly-windows) / [SPE-1071](https://linear.app/spectranoir/issue/SPE-1071/calendar-seasonal-cycle-and-time-gated-events) | No scheduling.                                                        |
| Week-close registration                  | existing week-close owners                                                                                                                                                                       | This helper is not called from week-close.                            |
| Hazardous-content propagation graphs     | SPE-956 / `src/domain/spe956PropagationGraphPersistence.ts`                                                                                                                                      | Different system. Do not extend it onto facility sections.            |
| Persistence and `SCHEMA_REGISTRY`        | later SPE-1606 child                                                                                                                                                                             | No GameState field this slice.                                        |
| SPE-3002 airflow rule                    | [SPE-3002](https://linear.app/spectranoir/issue/SPE-3002/spread-one-zone-spanning-event-by-airflow)                                                                                              | The airflow rule stays on its own apply.                              |
| SPE-3001 pulse cadence                   | [SPE-3001](https://linear.app/spectranoir/issue/SPE-3001/separate-zone-spanning-origin-affected-zones-and-one-recurrence-pulse)                                                                  | The pulse stays a week index on the record.                           |

Parent SPE-1606 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/zoneSpanningSiteEvent.contract.test.ts`
- `npm run lint`
- `npm run test:run`
- `npm run verify:backlog-handoff`
