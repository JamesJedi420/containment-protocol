# SPE-3031 — Surface historical-route replay anchors/edges in one bounded map/route chrome

| Field                | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**           | **In Progress**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Linear**           | [SPE-3031](https://linear.app/spectranoir/issue/SPE-3031/surface-historical-route-replay-anchorsedges-in-one-bounded-maproute)                                                                                                                                                                                                                                                                                                                                                                           |
| **Parent / lineage** | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — remains Backlog                                                                                                                                                                                                                                                                                                                                                                                              |
| **Presentation**     | [SPE-1080](https://linear.app/spectranoir/issue/SPE-1080/presentation-accessibility-and-simulation-explainability) / [SPE-2688](https://linear.app/spectranoir/issue/SPE-2688/shared-operational-explanation-surfaces)                                                                                                                                                                                                                                                                                   |
| **Related**          | [SPE-3026](https://linear.app/spectranoir/issue/SPE-3026/project-historical-route-replays-into-a-bounded-player-facing) / [SPE-3027](https://linear.app/spectranoir/issue/SPE-3027/persist-multi-site-spe-1392-historical-route-memory-graphs-on) / [SPE-3009](https://linear.app/spectranoir/issue/SPE-3009/replay-one-zone-spanning-event-over-a-reactivated-historical-route) / [SPE-3017](https://linear.app/spectranoir/issue/SPE-3017/persist-historical-route-replay-registries-with-fail-closed) |
| **Branch**           | `cursor/spe-3031-historical-route-replay-map-chrome-fce9`                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Base `main` SHA**  | `da704d9186af9a1b3bf8c789b2dd95599801f213`                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## Goal

Project already-authoritative historical-route replay anchors and edges into one bounded player-facing map/route-graph chrome. Read/projection only — no mutation, no activation, no invented coordinates, no causal overclaim.

This is SPE-3026 Deferred row 1 (Map / route-graph visual surfacing).

## Ownership audit

| Concern                                   | Existing owner reused by this slice                                      |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| Replay create / advance / resolve helpers | SPE-3009 / SPE-3018 / SPE-3020 — **unchanged**; not called by this slice |
| Canonical registry sanitize               | `normalizeHistoricalRouteReplayRegistry` / SPE-3017                      |
| Multi-site memory graphs                  | SPE-3027 `historicalRouteMemoryGraphs`                                   |
| Visibility gating                         | SPE-3026 `HistoricalRouteReplayVisibility`                               |
| Text explanation surface                  | SPE-3026 — **adjacent**, not duplicated as map truth                     |
| Calendar activation                       | SPE-3024 — **not imported or invoked**                                   |
| Map/route chrome adapter + panel          | **This slice**                                                           |

## Scope

- Pure `historicalRouteReplayMapChromeAdapter.ts` that reads SPE-3017 replays + SPE-3027 graphs via normalize helpers and emits deterministic chrome views.
- Visibility: reuse SPE-3026 `knownAnchorIds` / `includeFullRoute`; omit unauthorized anchors and edges that would reveal hidden route structure.
- Fail closed on missing memory-graph edges (no invent). No coordinates. No SPE-2932 spatial overlay.
- Thin `HistoricalRouteReplayMapChromePanel` mounted on `OperationsReportPanel` beside the SPE-3026 explanation panel.
- Targeted Vitest + slice doc + backlog handoff; retarget SPE-3026 Deferred map row to SPE-3031.

## Boundaries

Not implemented here:

- SPE-3009 / SPE-3017 / SPE-3018 / SPE-3020 / SPE-3024 / SPE-3026 helper semantic changes
- Automatic activation, calendar/start-condition, or interaction triggers
- SPE-950 possession / role / dialogue
- SPE-3007 `route_link` or facility adjacency invent
- SPE-1052 layout catalog reopen
- SPE-2932 facility section-graph spatial overlay
- Converting `causalClassification: unresolved` into asserted supernatural explanation
- Parallel map subsystem or broad UI redesign
- Parent SPE-1606 closure

## Acceptance

- [x] At least one persisted historical-route replay projects into bounded map/route chrome without mutating canonical state.
- [x] Low-visibility projections omit hidden anchors and edges.
- [x] Empty replay registry projects to an empty chrome list.
- [x] Multi-site memory graphs resolve sites/edges without inventing missing data.
- [x] Reordered registry keys produce the same chrome ordering.
- [x] Tests prove no SPE-3024 activation path is imported or invoked.
- [x] Slice doc, backlog handoff/manifest updated in-boundary; SPE-3026 Deferred map row retargeted.
- [x] Parent SPE-1606 remains **Backlog**.

## Validation

- `npm run test:run -- src/test/historicalRouteReplayMapChrome.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run verify:audits-index`
- `npm run verify:theme-contracts`

## Deferred

| Item                                      | Suggested owner issue                                                                                 | Why deferred                                                               |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Knowledge-system-driven visibility inputs | Later SPE-1080 / intel child                                                                          | Conservative default visibility from SPE-3026 is enough for this consumer. |
| Interaction-triggered mid-week starts     | Later [SPE-1605](https://linear.app/spectranoir/issue/SPE-1605/scenario-event-start-conditions) child | Activation remains SPE-3024 / SPE-1605; this slice is read-only.           |
| SPE-2932 spatial overlay placement        | Later SPE-1080 / SPE-1104 / SPE-1244 child                                                            | Topological chrome is enough; no coordinates invented in this slice.       |
| Full cartographic map framework           | SPE-1104 / SPE-1244                                                                                   | Out of bound; this is one Operations-report chrome consumer only.          |
