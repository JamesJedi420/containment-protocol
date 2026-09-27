# SPE-3040 — Fire historical-route replay search start from site exploration search

| Field                        | Value                                                                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                   | **Recently shipped**                                                                                                                                                               |
| **Linear**                   | [SPE-3040](https://linear.app/spectranoir/issue/SPE-3040/fire-historical-route-replay-search-start-from-site-exploration-search)                                                   |
| **Parent / lineage**         | [SPE-1605](https://linear.app/spectranoir/issue/SPE-1605/scenario-event-start-conditions) — remains Backlog                                                                        |
| **Prerequisite activator**   | [SPE-3033](https://linear.app/spectranoir/issue/SPE-3033/activate-one-historical-route-replay-from-an-interaction-start) — Done; do not reopen activator semantics                 |
| **Sibling calendar**         | [SPE-3024](https://linear.app/spectranoir/issue/SPE-3024/activate-historical-route-replays-from-calendarstart-condition-policy) — Done; do not reopen calendar policy              |
| **Sibling site-action wire** | [SPE-3034](https://linear.app/spectranoir/issue/SPE-3034/fire-one-historical-route-replay-interaction-start-from-an-existing) — Done; do not reopen `enter_zone` semantics        |
| **Sibling ask wire**         | [SPE-3035](https://linear.app/spectranoir/issue/SPE-3035/fire-historical-route-replay-interview-witness-start-from) — Done; do not reopen `interview_witness` semantics           |
| **Deferred source**          | SPE-3035 Deferred row 1 (`search` / site-exploration search wire)                                                                                                                  |
| **Prerequisite create**      | [SPE-3009](https://linear.app/spectranoir/issue/SPE-3009/replay-one-zone-spanning-event-over-a-reactivated-historical-route) — unchanged                                           |
| **Prerequisite persistence** | [SPE-3017](https://linear.app/spectranoir/issue/SPE-3017/persist-historical-route-replay-registries-with-fail-closed) — unchanged                                                 |
| **Branch**                   | `cursor/spe-1605-site-search-replay-start-078b`                                                                                                                                    |
| **Base `main` SHA**          | `26dc819d0a69f26bf7eb52aeec3d229077fdda37`                                                                                                                                         |

## Goal

Wire one existing domain site-exploration action that already matches one SPE-1605 interaction kind so a thin store wrapper calls `activateHistoricalRouteReplayRegistryForInteractionStart` with persisted `historicalRouteReplayActivationCandidates` and writes `historicalRouteReplays`.

## Ownership audit

| Concern                                   | Existing owner reused by this slice                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| Interaction activator                     | `activateHistoricalRouteReplayRegistryForInteractionStart` / SPE-3033 — unchanged |
| Calendar `absolute_week` activation       | `activateHistoricalRouteReplayRegistryForCalendarWeek` / SPE-3024 — unchanged     |
| Week-close advance                        | SPE-3018 — unchanged; mid-week create of approaching only                         |
| Site exploration search                   | Domain `applySiteExplorationAction(..., 'search')` (SPE-1610)                     |
| SPE-1605 `search` signal                  | **This slice** — `interactionKind: 'search'`, `interactionId: caseId`             |
| SPE-1605 `enter_zone` site visit          | SPE-3034 / store `recordSceneVisit` — unchanged                                   |
| SPE-1605 `interview_witness` ask          | SPE-3035 / store `askInvestigationQuestion` — unchanged                           |

## Owned store wire

- New thin store action: store `applySiteExplorationSearch` → domain `applySiteExplorationAction(..., 'search')` only (not a generic exploration-action store command)
- SPE-1605 kind: `search`
- Signal: `{ interactionKind: 'search', interactionId: <trimmed caseId> }`
- Gate: fire only when `applySiteExplorationAction` returns `applied: true` (`invalid_case`, `not_site_exploration`, and other non-applied results stay no-ops)
- Candidates: persisted `historicalRouteReplayActivationCandidates`
- Graphs: SPE-3027 dual-read via `normalizeHistoricalRouteMemoryGraphsFromGameState`
- Persist: write activator result to `historicalRouteReplays`
- Timing: mid-week create of `approaching` only; SPE-3018 advance stays week-close
- Kind choice: UI text-filter search boxes are not this action; `breach` alert is not `make_noise`; `repair`/`disarm` are not `operate_control`

## Scope

- Thinnest store call into the SPE-3033 activator from `applySiteExplorationSearch` after a successful apply.
- Targeted Vitest + slice doc + backlog handoff; retarget SPE-3035 Deferred row 1 for this wire.
- No new GameState field. No save version bump. No UI redesign.

## Boundaries

Not implemented here:

- SPE-3033 activator semantic rewrite
- SPE-3024 calendar helper rewrite
- SPE-3018 advance / SPE-3020 resolve
- SPE-3034 `enter_zone` / SPE-3035 `interview_witness` semantic change
- Full SPE-1605 dormant/armed/spent/recurring state machine
- Wiring remaining SPE-1605 kinds (`make_noise`, `operate_control`, `open_access`, `remove_asset`, `touch_sensitive_object`)
- Anniversary / week-of-year / seasonal start conditions
- UI redesign / new interaction taxonomy
- Parent SPE-1605 closure

## Acceptance

- [x] Matching applied site search (`search` + authored caseId) + active SPE-1392 graph writes an `approaching` persisted replay.
- [x] Different caseId (applied or not) OR rejected search leaves the registry frozen.
- [x] Rejected search does not activate even when a matching candidate exists.
- [x] Calendar week-close still ignores interaction-only `search` candidates.
- [x] Mid-week call does not advance the replay (approaching only).
- [x] Slice doc, backlog handoff/manifest, SPE-3035 Deferred row 1 retargeted for this wire.
- [x] Parent SPE-1605 remains **Backlog**.

## Validation

- `npm run test:run -- src/app/store/gameStore.test.ts`
- `npm run test:run -- src/test/historicalRouteReplayActivation.contract.test.ts`
- `npm run test:run -- src/test/siteOperationalExploration.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`

## Deferred

| Item                                                                                         | Suggested owner issue           | Why deferred                                                                 |
| -------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------- |
| Wire remaining SPE-1605 kinds (`make_noise`, `operate_control`, `open_access`, `remove_asset`, `touch_sensitive_object`) | Later SPE-1605 child            | This child owns only `search` / `applySiteExplorationSearch`.                |
| Full SPE-1605 dormant/armed/spent/recurring state machine                                    | Later SPE-1605 child            | Out of this store-wire boundary.                                             |
| Anniversary / week-of-year / seasonal start conditions                                       | Later SPE-1071 / SPE-1605 child | Outside this interaction wire; calendar absolute week remains SPE-3024.      |
