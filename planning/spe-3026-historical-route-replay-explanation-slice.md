# SPE-3026 — Project historical-route replays into a bounded player-facing explanation surface

| Field                | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**           | **Recently shipped**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Linear**           | [SPE-3026](https://linear.app/spectranoir/issue/SPE-3026/project-historical-route-replays-into-a-bounded-player-facing)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Parent / lineage** | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — remains Backlog                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Presentation**     | [SPE-1080](https://linear.app/spectranoir/issue/SPE-1080/presentation-accessibility-and-simulation-explainability) / [SPE-2688](https://linear.app/spectranoir/issue/SPE-2688/shared-operational-explanation-surfaces)                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Related**          | [SPE-3009](https://linear.app/spectranoir/issue/SPE-3009/replay-one-zone-spanning-event-over-a-reactivated-historical-route) / [SPE-3017](https://linear.app/spectranoir/issue/SPE-3017/persist-historical-route-replay-registries-with-fail-closed) / [SPE-3018](https://linear.app/spectranoir/issue/SPE-3018/advance-persisted-historical-route-replays-at-campaign-week-close) / [SPE-3020](https://linear.app/spectranoir/issue/SPE-3020/auto-resolve-historical-route-replay-terminal-ended-with-ordinary) / [SPE-3024](https://linear.app/spectranoir/issue/SPE-3024/activate-historical-route-replays-from-calendarstart-condition-policy) |
| **Branch**           | `cursor/spe-3026-historical-route-replay-explanation-a7f3`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Base `main` SHA**  | `954c90d78e6cee828dfeb031f56beadaafe46d0d`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

## Goal

Project already-authoritative `GameState.historicalRouteReplays` into a bounded player-facing SPE-2688 explanation surface. Read/projection only — no mutation, no activation, no new replay mechanics, no causal overclaim.

## Ownership audit

| Concern                                   | Existing owner reused by this slice                                      |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| Replay create / advance / resolve helpers | SPE-3009 / SPE-3018 / SPE-3020 — **unchanged**; not called by this slice |
| Canonical registry sanitize               | `normalizeHistoricalRouteReplayRegistry` / SPE-3017                      |
| Calendar activation                       | SPE-3024 — **not imported or invoked**                                   |
| Shared explanation contract               | `operationalExplanation.ts` / SPE-2688                                   |
| Player-facing explanation adapter + panel | **This slice**                                                           |

## Scope

- Extend SPE-2688 `OperationalExplanationSource` with `historical_route_replay` / `replay_record`.
- Add pure `historicalRouteReplayExplanationAdapter.ts` that reads via SPE-3017 normalize and emits deterministic `OperationalExplanationRecord[]`.
- Visibility gating: known anchors only; observer exposures opt-in; full route opt-in; ended surfaces ordinary consequence with unresolved causality wording.
- Thin `HistoricalRouteReplayExplanationPanel` mounted on `OperationsReportPanel` with conservative default visibility reconstructed each render.
- Targeted Vitest + slice doc + backlog handoff; retarget SPE-3024 Deferred presentation row to SPE-3026.

## Boundaries

Not implemented here:

- SPE-3009 / SPE-3017 / SPE-3018 / SPE-3020 / SPE-3024 helper semantic changes
- Automatic activation, calendar/start-condition, or interaction triggers
- SPE-950 possession / role / dialogue
- SPE-3007 `route_link` or facility adjacency invent
- Converting `causalClassification: unresolved` into asserted supernatural explanation
- Broad UI redesign or UI-owned persistence of explanation truth
- Parent SPE-1606 closure

## Acceptance

- [x] At least one persisted historical-route replay projects into a player-facing explanation without mutating canonical state.
- [x] Approaching / traversing / terminal / ended produce deterministic bounded presentation.
- [x] Contact / post-contact evidence appears only when `includeObserverExposures` is true.
- [x] Ended surfaces ordinary consequence while retaining unresolved causality wording.
- [x] Hidden route / evidence absent from lower-knowledge projections.
- [x] Reordered registry keys produce the same presentation ordering.
- [x] Tests prove no activation path is imported or invoked.
- [x] Slice doc, backlog handoff/manifest updated in-boundary.
- [x] Parent SPE-1606 remains **Backlog**.

## Validation

- `npm run test:run -- src/test/historicalRouteReplayExplanation.contract.test.ts src/test/operationalExplanation.integration.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run verify:audits-index`
- `npm run verify:theme-contracts`
- `npm run test:run:ci`

## Deferred

| Item                                      | Suggested owner issue                                                                                                                                                                            | Why deferred                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Map / route-graph visual surfacing        | [SPE-3031](https://linear.app/spectranoir/issue/SPE-3031/surface-historical-route-replay-anchorsedges-in-one-bounded-maproute) — `planning/spe-3031-historical-route-replay-map-chrome-slice.md` | Retargeted from this slice; SPE-3026 owns SPE-2688 text explanation only. |
| Knowledge-system-driven visibility inputs | Later SPE-1080 / intel child                                                                                                                                                                     | Conservative default visibility is enough for the first consumer.         |
| Interaction-triggered mid-week starts     | Later [SPE-1605](https://linear.app/spectranoir/issue/SPE-1605/scenario-event-start-conditions) child                                                                                            | Activation remains SPE-3024 / SPE-1605; this slice is read-only.          |
