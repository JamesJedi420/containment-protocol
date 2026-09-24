# SPE-1392 — Historical route memory and nonlocal edge graph

| Field | Value |
| --- | --- |
| **Status** | **In review** |
| **Linear** | [SPE-1392](https://linear.app/spectranoir/issue/SPE-1392/historical-route-memory-and-nonlocal-edge-graph) |
| **Consumer** | [SPE-3009](https://linear.app/spectranoir/issue/SPE-3009/replay-one-zone-spanning-event-over-a-reactivated-historical-route) — remains fail-closed until this contract lands |
| **Related boundary** | [SPE-3007](https://linear.app/spectranoir/issue/SPE-3007/spread-one-zone-spanning-event-by-route-link) owns present authored route-link spread; [SPE-765](https://linear.app/spectranoir/issue/SPE-765/anomalous-route-graphs-and-misrouting) owns anomalous navigation/misrouting |
| **Branch** | `cursor/spe-1392-historical-route-memory` |
| **Base `main` SHA** | `1ce421a342978d4802896cea4f5687a2456f89cb` |

## Goal

Provide one authoritative, site-scoped memory graph for prior activation anchors and historical/nonlocal edges. Historical edges can be remembered, reactivated in a later activation, queried independently from what investigators currently know, and resolved as deterministic active paths.

This is graph memory, not actor movement or a generic teleport mechanic.

## Pre-coding findings

- The facility section graph owns current `spatial_adjacency`; it intentionally rejects other edge classes.
- SPE-3007's `route_link` source is present-day authored propagation over edges that already exist as facility adjacency.
- Recon already treats occupier-unknown routes as concealed information, but there is no historical-route memory store to reuse.
- No existing domain module records prior site activation anchors or reactivatable nonlocal historical edges.

## Contract

`src/domain/historicalRouteMemory.ts` defines:

- `HistoricalRouteMemoryGraph` — site-scoped anchor and edge memory plus the explicitly active activation/edge set.
- `historical_nonlocal` — an edge class intentionally distinct from facility `spatial_adjacency`.
- anchor kinds: `activation_point`, `landmark`, `historical_exit`.
- route kinds: `recurring_site`, `historical_exit`, `contamination_route`.
- knowledge states: `unknown`, `inferred`, `verified`.
- activation histories and contamination histories on both anchors and edges.
- reconnaissance confidence kept separate from mechanical activation.
- explicit reactivation and deterministic directed-path resolution over only the active historical edges.

## Fail-closed rules

- An observed edge cannot create a missing anchor.
- Reusing an edge id with different endpoints or a different route kind rejects the update.
- Reactivation cannot invent an edge.
- Contamination cannot invent an edge.
- Active-edge reads require the matching activation id.
- Historical path resolution never falls back to facility adjacency or SPE-3007 `route_link`.

## Acceptance mapping

- **A site can remember past anchor points:** repeated activation observations preserve first/last activation ids and canonical activation history.
- **Historical edges can become active again in later runs:** `reactivateHistoricalRouteEdges` explicitly activates remembered edges under a later activation id and records the new participation.
- **Current route knowledge can be incomplete or inferred:** mechanical edge existence/activation is separate from `unknown | inferred | verified` knowledge and reconnaissance confidence.
- **Can parent recurring dungeons, historical exits, and contamination-route networks:** edge route kind is explicit; contamination history attaches only to existing remembered routes.

## Boundary

Out of scope:

- GameState persistence or save migration
- facility topology mutation
- SPE-3007 present-day `route_link` behavior
- actor movement, teleportation, travel time, misrouting, or pathfinding
- player-map discovery updates
- automatic calendar/week-close activation
- SPE-3009 route-bound reenactment progression

SPE-3009 may consume the active-edge/path read seam after this issue lands; until then its historical-route source remains absent and it must fail closed.

## Validation

Targeted contract coverage: `src/test/historicalRouteMemory.contract.test.ts`.

Repository-wide validation expected before merge:

- `npm run lint`
- `npm run test:run`
- `npm run build`
