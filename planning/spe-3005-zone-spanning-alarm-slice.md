# SPE-3005 — Spread one zone-spanning event by alarm

| Field               | Value                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                    |
| **Linear**          | [SPE-3005](https://linear.app/spectranoir/issue/SPE-3005/spread-one-zone-spanning-event-by-alarm)                                                       |
| **Parent**          | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — stays **Backlog** (this child does not finish the umbrella) |
| **Prerequisite**    | [SPE-3004](https://linear.app/spectranoir/issue/SPE-3004/spread-one-zone-spanning-event-by-panic) — existing record and panic rule only                 |
| **Branch**          | `cursor/spe-3005-zone-spanning-alarm`                                                                                                                   |
| **Base `main` SHA** | `92cee649da2f5d139f22da63998542329e44efd2`                                                                                                              |

## Goal

One additional rule id on the existing zone-spanning record. Alarm resolves only from pairs the facility graph already has as `spatial_adjacency` edges. A missing alarm source fails closed and does not write affected ids.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/zoneSpanningSiteEvent.ts`; `src/test/zoneSpanningSiteEvent.contract.test.ts`; `src/domain/siteEventTopologyPropagation.ts`; `src/domain/facilitySectionGraph.ts` |
| Current behavior  | SPE-3004 applies `panic` beside `visibility`, `airflow`, and `spatial_adjacency`. The production graph has no alarm field. SPE-2932 rejects a non-adjacency edge class.      |
| Expected behavior | `applyZoneSpanningAlarm` writes affected ids, origin removed, only along existing edges named by an optional `alarm` list. A missing source returns the same record.         |
| Boundary          | One rule id, contract tests, this slice doc, and backlog handoff. No new edge class. No production topology edit. No panic, visibility, or airflow behavior change.          |
| Risks             | Treating a missing source as an adjacency, airflow, visibility, or panic write. Inventing an edge for a pair the graph does not already have.                                |
| Validation        | `src/test/zoneSpanningSiteEvent.contract.test.ts`, lint, `npm run test:run`, `npm run verify:backlog-handoff`                                                                |
| Docs              | This slice doc; `planning/spe-3004-zone-spanning-panic-slice.md` deferred row; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY` change. |

## Boundary

### In scope

- Rule id `alarm` beside `panic`, `visibility`, `airflow`, and `spatial_adjacency`
- `applyZoneSpanningAlarm` reads an optional `alarm` list of `{ fromNodeId, toNodeId }` on an authored topology
- A pair counts only when `queryDirectSpatialAdjacency` already reports that edge (same pair rules as panic)
- Success stores reached ids with the origin removed, in canonical edge order
- A missing source (production read, omitted list, malformed list, or no pair that is already an edge) returns the input record, including when a panic, visibility, or airflow list is present
- `propagateSiteEventOverFacilityTopology` validates topology and origin. Its adjacency result is not copied, and the airflow, visibility, and panic results are not copied, when the alarm lookup fails

### Out of scope

- SPE-3004 panic behavior, SPE-3003 visibility behavior, SPE-3002 airflow behavior, and SPE-3001 pulse cadence
- SPE-2932 topology contents and SPE-2994 walk behavior
- Contamination spread
- Route burdens, actor movement, map discovery, trail evidence, and calendar activation
- SPE-956 propagation graphs, persistence, `SCHEMA_REGISTRY`, UI, and week-close registration

## Seam

`applyZoneSpanningAlarm` is pure. It does not author edges. The production graph has no alarm source, so a production read returns the same record. Hydration and week-close do not call this function.

## Acceptance

- [x] An authored alarm list of existing edges leaves the origin off the affected list
- [x] A missing alarm source keeps the affected array reference, including when a panic, visibility, or airflow list is present
- [x] A pair that is not an existing spatial edge does not add that node
- [x] Panic, visibility, airflow, adjacency, and the SPE-3001 pulse stay unchanged
- [x] No new GameState field and no SPE-2932 edge class

## Deferred

| Item or mechanic                         | Owner or prerequisite                                                                                                                                                                            | Why deferred                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Contamination spread                     | [SPE-3006](https://linear.app/spectranoir/issue/SPE-3006/spread-one-zone-spanning-event-by-contamination)                                                                                        | One rule id on the zone-spanning record. This slice stays alarm. |
| Facility topology mutation and placement | [SPE-2932](https://linear.app/spectranoir/issue/SPE-2932/authoritative-facility-section-graph-and-placement-kernel)                                                                              | This slice only reads a validated graph.                         |
| Route-kind traversal cost                | [SPE-1026](https://linear.app/spectranoir/issue/SPE-1026/facility-layout-strategy-and-zone-adjacency-model)                                                                                      | Route burdens are not facility section edges.                    |
| Actor movement and pathfinding           | existing movement owners                                                                                                                                                                         | No patrol or route-control simulation.                           |
| Map discovery and hidden routes          | existing map/knowledge owners                                                                                                                                                                    | No player-visible route knowledge.                               |
| Trail evidence and residue               | [SPE-606](https://linear.app/spectranoir/issue/SPE-606/layered-tracking-and-trail-forensics) / [SPE-1612](https://linear.app/spectranoir/issue/SPE-1612/environmental-route-mark-clues)          | No forensic reconstruction.                                      |
| Calendar activation                      | [SPE-646](https://linear.app/spectranoir/issue/SPE-646/calendar-bound-anomaly-windows) / [SPE-1071](https://linear.app/spectranoir/issue/SPE-1071/calendar-seasonal-cycle-and-time-gated-events) | No scheduling.                                                   |
| Week-close registration                  | existing week-close owners                                                                                                                                                                       | This helper is not called from week-close.                       |
| Hazardous-content propagation graphs     | SPE-956 / `src/domain/spe956PropagationGraphPersistence.ts`                                                                                                                                      | Different system. Do not extend it onto facility sections.       |
| Persistence and `SCHEMA_REGISTRY`        | later SPE-1606 child                                                                                                                                                                             | No GameState field this slice.                                   |
| SPE-3004 panic rule                      | [SPE-3004](https://linear.app/spectranoir/issue/SPE-3004/spread-one-zone-spanning-event-by-panic)                                                                                                | The panic rule stays on its own apply.                           |
| SPE-3003 visibility rule                 | [SPE-3003](https://linear.app/spectranoir/issue/SPE-3003/spread-one-zone-spanning-event-by-visibility)                                                                                           | The visibility rule stays on its own apply.                      |
| SPE-3002 airflow rule                    | [SPE-3002](https://linear.app/spectranoir/issue/SPE-3002/spread-one-zone-spanning-event-by-airflow)                                                                                              | The airflow rule stays on its own apply.                         |
| SPE-3001 pulse cadence                   | [SPE-3001](https://linear.app/spectranoir/issue/SPE-3001/separate-zone-spanning-origin-affected-zones-and-one-recurrence-pulse)                                                                  | The pulse stays a week index on the record.                      |

Parent SPE-1606 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/zoneSpanningSiteEvent.contract.test.ts`
- `npm run lint`
- `npm run test:run`
- `npm run verify:backlog-handoff`
