# SPE-3034 — Fire one historical-route replay interaction start from an existing site action

| Field                        | Value                                                                                                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                   | **Recently shipped**                                                                                                                                                         |
| **Linear**                   | [SPE-3034](https://linear.app/spectranoir/issue/SPE-3034/fire-one-historical-route-replay-interaction-start-from-an-existing)                                                     |
| **Parent / lineage**         | [SPE-1605](https://linear.app/spectranoir/issue/SPE-1605/scenario-event-start-conditions) — remains Backlog                                                                      |
| **Prerequisite activator**   | [SPE-3033](https://linear.app/spectranoir/issue/SPE-3033/activate-one-historical-route-replay-from-an-interaction-start) — Done; do not reopen activator semantics               |
| **Sibling calendar**         | [SPE-3024](https://linear.app/spectranoir/issue/SPE-3024/activate-historical-route-replays-from-calendarstart-condition-policy) — Done; do not reopen calendar policy            |
| **Deferred source**          | SPE-3033 Deferred row 1 (Store/UI interaction command that fires the seam)                                                                                                       |
| **Prerequisite create**      | [SPE-3009](https://linear.app/spectranoir/issue/SPE-3009/replay-one-zone-spanning-event-over-a-reactivated-historical-route) — unchanged                                         |
| **Prerequisite persistence** | [SPE-3017](https://linear.app/spectranoir/issue/SPE-3017/persist-historical-route-replay-registries-with-fail-closed) — unchanged                                               |
| **Branch**                   | `cursor/spe-3034-site-action-historical-route-replay-start-24bd`                                                                                                                 |
| **Base `main` SHA**          | `49cf89c59894b6b6a94c69a331de892b499f7dd4`                                                                                                                                       |

## Goal

Wire one existing site action that already matches one SPE-1605 interaction kind so it calls `activateHistoricalRouteReplayRegistryForInteractionStart` with persisted `historicalRouteReplayActivationCandidates` and writes `historicalRouteReplays`.

## Ownership audit

| Concern                                   | Existing owner reused by this slice                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| Interaction activator                     | `activateHistoricalRouteReplayRegistryForInteractionStart` / SPE-3033 — unchanged |
| Calendar `absolute_week` activation       | `activateHistoricalRouteReplayRegistryForCalendarWeek` / SPE-3024 — unchanged     |
| Week-close advance                        | SPE-3018 — unchanged; mid-week create of approaching only                         |
| Site scene visit                          | Store `recordSceneVisit` → domain `recordSceneVisit`                              |
| SPE-1605 `enter_zone` signal              | **This slice** — `interactionKind: 'enter_zone'`, `interactionId: sceneId`        |

## Owned store wire

- Existing site action: store `recordSceneVisit`
- SPE-1605 kind: `enter_zone`
- Signal: `{ interactionKind: 'enter_zone', interactionId: <visited sceneId> }`
- Gate: same non-empty trimmed `sceneId` + `locationId` the domain visit requires (rejected visits do not re-fire a stale current scene)
- Candidates: persisted `historicalRouteReplayActivationCandidates`
- Graphs: SPE-3027 dual-read via `normalizeHistoricalRouteMemoryGraphsFromGameState`
- Persist: write activator result to `historicalRouteReplays`
- Timing: mid-week create of `approaching` only; SPE-3018 advance stays week-close

## Scope

- Thinnest store call into the SPE-3033 activator from `recordSceneVisit`.
- Targeted Vitest + slice doc + backlog handoff; retarget SPE-3033 Deferred row 1 here.
- No new GameState field. No save version bump. No UI redesign.

## Boundaries

Not implemented here:

- SPE-3033 activator semantic rewrite
- SPE-3024 calendar helper rewrite
- SPE-3018 advance / SPE-3020 resolve
- Full SPE-1605 dormant/armed/spent/recurring state machine
- Wiring every SPE-1605 interaction kind from every site action
- UI redesign / new interaction taxonomy
- Parent SPE-1605 closure

## Acceptance

- [x] Matching `recordSceneVisit` (`enter_zone` + authored sceneId) + active SPE-1392 graph writes an `approaching` persisted replay.
- [x] No-match scene visit leaves the registry frozen (no-op).
- [x] Calendar week-close still ignores interaction candidates.
- [x] Mid-week call does not advance the replay (approaching only).
- [x] Slice doc, backlog handoff/manifest, SPE-3033 Deferred row 1 retargeted.
- [x] Parent SPE-1605 remains **Backlog**.

## Validation

- `npm run test:run -- src/app/store/gameStore.test.ts`
- `npm run test:run -- src/test/historicalRouteReplayActivation.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`

## Deferred

| Item                                                      | Suggested owner issue               | Why deferred                                                                 |
| --------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| Wire remaining SPE-1605 kinds from other site actions (`interview_witness` / `askInvestigationQuestion` owned by SPE-3035; remaining kinds still later) | [SPE-3035](https://linear.app/spectranoir/issue/SPE-3035/fire-historical-route-replay-interview-witness-start-from) (`interview_witness`); later SPE-1605 child for remaining kinds | One `enter_zone` scene-visit wire satisfies SPE-3033 Deferred row 1; SPE-3035 owns the next `interview_witness` ask wire. |
| Full SPE-1605 dormant/armed/spent/recurring state machine | Later SPE-1605 child                | Out of this store-wire boundary.                                             |
| Anniversary / week-of-year / seasonal start conditions    | Later SPE-1071 / SPE-1605 child     | Outside this interaction wire; calendar absolute week remains SPE-3024.      |
