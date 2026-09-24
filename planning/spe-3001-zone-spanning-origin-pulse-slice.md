# SPE-3001 — Separate zone-spanning origin, affected zones, and one recurrence pulse

| Field               | Value                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                                      |
| **Linear**          | [SPE-3001](https://linear.app/spectranoir/issue/SPE-3001/separate-zone-spanning-origin-affected-zones-and-one-recurrence-pulse)                                           |
| **Parent**          | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — stays **Backlog** (this child does not finish the umbrella)                   |
| **Prerequisite**    | [SPE-2994](https://linear.app/spectranoir/issue/SPE-2994/propagate-site-events-over-authoritative-facility-topology) — call `propagateSiteEventOverFacilityTopology` only |
| **Branch**          | `cursor/spe-3001-zone-spanning-origin-pulse-3ed0`                                                                                                                         |
| **Base `main` SHA** | `7a70af30eeaa85aad8b4458056d063dd9fc81342`                                                                                                                                |

## Goal

One pure record stores a distinct origin node id, an affected-zone list, and a single `spatial_adjacency` rule. One pulse subsides and returns after a fixed week count. Site-wide state is a boolean on that record.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | `src/domain/siteEventTopologyPropagation.ts`; `src/test/siteEventTopologyPropagation.contract.test.ts`; `src/domain/facilitySectionGraph.ts`                                      |
| Current behavior  | SPE-2994 walks one bounded event and returns origin plus affected nodes together. Nothing stores origin apart from the affected list, and nothing pulses.                         |
| Expected behavior | Success writes affected ids with the origin removed. Failure returns the same record. One authored cadence is active, subsided, then active again. `siteWide` does not add edges. |
| Boundary          | New pure module, contract tests, this slice doc, and backlog handoff. No GameState field. No second graph.                                                                        |
| Risks             | Treating a failed walk as an affected-zone write. Running the pulse mid-week. Inventing edges for site-wide.                                                                      |
| Validation        | `src/test/zoneSpanningSiteEvent.contract.test.ts`, `src/test/siteEventTopologyPropagation.contract.test.ts`, lint, `npm run test:run`, `npm run verify:backlog-handoff`           |
| Docs              | This slice doc; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY` change.                                                                     |

## Boundary

### In scope

- `applyZoneSpanningAdjacency` calls `propagateSiteEventOverFacilityTopology`
- Propagation rule stays `spatial_adjacency`
- Success stores affected node ids with the origin removed, in walk order
- Failure returns the input record and keeps the affected array reference
- `siteWide` is a boolean copied through; it does not add nodes or edges
- `resolveZoneSpanningPulse` uses a non-negative integer week index
- Period is `activeWeekCount + returnAfterWeekCount`; the pulse returns on the next period

### Out of scope

- SPE-2932 topology contents and SPE-2994 walk behavior
- Airflow, visibility, panic, alarm, and contamination spread
- Route burdens, actor movement, map discovery, trail evidence, and calendar activation
- SPE-956 propagation graphs, persistence, `SCHEMA_REGISTRY`, UI, and week-close registration

## Seam

`src/domain/zoneSpanningSiteEvent.ts` is pure. It does not author adjacency. Hydration and week-close do not call this module. A fractional or negative week index resolves `inactive`.

## Acceptance

- [x] A production walk from `section:clinical` leaves the origin distinct from `room:med_bay` and `zone:medical`
- [x] A failed walk leaves the affected list unchanged, including array identity
- [x] Reversed authored edges keep the same affected sequence
- [x] `siteWide: true` leaves the production edge count at 3
- [x] Pulse `activeWeekCount: 1` and `returnAfterWeekCount: 1` is active, subsided, then active
- [x] Week `1.5` is not active
- [x] No new GameState field and no SPE-956 graph change

## Deferred

| Item or mechanic                                   | Owner or prerequisite                                                                                                                                                                            | Why deferred                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Airflow spread                                     | [SPE-3002](https://linear.app/spectranoir/issue/SPE-3002/spread-one-zone-spanning-event-by-airflow)                                                                                              | One rule id on the zone-spanning record. This slice stays adjacency and pulse. |
| Visibility, panic, alarm, and contamination spread | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation)                                                                                                        | Those families stay on the parent.                                             |
| Facility topology mutation and placement           | [SPE-2932](https://linear.app/spectranoir/issue/SPE-2932/authoritative-facility-section-graph-and-placement-kernel)                                                                              | This slice only reads a validated graph through SPE-2994.                      |
| Route-kind traversal cost                          | [SPE-1026](https://linear.app/spectranoir/issue/SPE-1026/facility-layout-strategy-and-zone-adjacency-model)                                                                                      | Route burdens are not facility section edges.                                  |
| Actor movement and pathfinding                     | existing movement owners                                                                                                                                                                         | No patrol or route-control simulation.                                         |
| Map discovery and hidden routes                    | existing map/knowledge owners                                                                                                                                                                    | No player-visible route knowledge.                                             |
| Trail evidence and residue                         | [SPE-606](https://linear.app/spectranoir/issue/SPE-606/layered-tracking-and-trail-forensics) / [SPE-1612](https://linear.app/spectranoir/issue/SPE-1612/environmental-route-mark-clues)          | No forensic reconstruction.                                                    |
| Calendar activation                                | [SPE-646](https://linear.app/spectranoir/issue/SPE-646/calendar-bound-anomaly-windows) / [SPE-1071](https://linear.app/spectranoir/issue/SPE-1071/calendar-seasonal-cycle-and-time-gated-events) | No scheduling. The pulse is a week index, not a calendar hook.                 |
| Week-close registration                            | existing week-close owners                                                                                                                                                                       | The pulse helper is not called from week-close.                                |
| Hazardous-content propagation graphs               | SPE-956 / `src/domain/spe956PropagationGraphPersistence.ts`                                                                                                                                      | Different system. Do not extend it onto facility sections.                     |
| Persistence and `SCHEMA_REGISTRY`                  | later SPE-1606 child                                                                                                                                                                             | No GameState field this slice.                                                 |

Parent SPE-1606 remains **Backlog**.

## Validation

- Targeted Vitest: `src/test/zoneSpanningSiteEvent.contract.test.ts`
- Regression: `src/test/siteEventTopologyPropagation.contract.test.ts`
- `npm run lint`
- `npm run test:run`
- `npm run verify:backlog-handoff`
