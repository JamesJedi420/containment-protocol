# SPE-2149 — Multidimensional transport network registry (slice 1)

## Goal

Deterministic registry for layered transport-network governance metadata under parent SPE-765.

## Boundary

In scope:

- `src/domain/multidimensionalTransportNetworkRegistry.ts`
- `src/test/multidimensionalTransportNetworkRegistry.test.ts`
- this slice doc

Fields: `networkLayerRefs[]`, `fareAccessRules[]`, `stationRiskBands[]`, `lostPersonQueue`.

Out of scope:

- GameState persistence / week-close
- live route traversal, map rendering, endpoint resolution
- SPE-3433 failed-transit personnel continuity handoff / missing-person lifecycle
- parent SPE-765 full anomalous route-graph simulation

## Acceptance mapping

| Criterion                                    | Evidence                                                    |
| -------------------------------------------- | ----------------------------------------------------------- |
| Non-empty layers + legal fare rules pass     | `LAYERED_ROUTE_GOVERNANCE_FIXTURE` + validation test        |
| Overlapping contradictory access rejected    | `CONTRADICTORY_ACCESS_RULE_FIXTURE`                         |
| Deterministic lost-person queue order/insert | `orderLostPersonQueue` / `insertLostPersonQueueEntry` tests |
| Projection without traversal                 | `projectTransportNetworkRegistry`                           |

## Branch

`jamesdyedbq/spe-2149-multidimensional-transport-network`

## Deferred

None in-boundary.
