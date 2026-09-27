# SPE-3035 — Fire historical-route replay interview_witness start from askInvestigationQuestion

| Field                        | Value                                                                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                   | **In Progress**                                                                                                                                                                    |
| **Linear**                   | [SPE-3035](https://linear.app/spectranoir/issue/SPE-3035/fire-historical-route-replay-interview-witness-start-from)                                                                |
| **Parent / lineage**         | [SPE-1605](https://linear.app/spectranoir/issue/SPE-1605/scenario-event-start-conditions) — remains Backlog                                                                        |
| **Prerequisite activator**   | [SPE-3033](https://linear.app/spectranoir/issue/SPE-3033/activate-one-historical-route-replay-from-an-interaction-start) — Done; do not reopen activator semantics                 |
| **Sibling calendar**         | [SPE-3024](https://linear.app/spectranoir/issue/SPE-3024/activate-historical-route-replays-from-calendarstart-condition-policy) — Done; do not reopen calendar policy              |
| **Sibling site-action wire** | [SPE-3034](https://linear.app/spectranoir/issue/SPE-3034/fire-one-historical-route-replay-interaction-start-from-an-existing) — Done; do not reopen `enter_zone` semantics        |
| **Deferred source**          | SPE-3034 Deferred row 1 (`interview_witness` / `askInvestigationQuestion` wire)                                                                                                    |
| **Prerequisite create**      | [SPE-3009](https://linear.app/spectranoir/issue/SPE-3009/replay-one-zone-spanning-event-over-a-reactivated-historical-route) — unchanged                                           |
| **Prerequisite persistence** | [SPE-3017](https://linear.app/spectranoir/issue/SPE-3017/persist-historical-route-replay-registries-with-fail-closed) — unchanged                                                 |
| **Branch**                   | `cursor/spe-3035-ask-investigation-replay-start-5701`                                                                                                                              |
| **Base `main` SHA**          | `c4f8215a3233d093cdd6a200cce2643bfb554056`                                                                                                                                         |

## Goal

Wire one existing store action that already matches one SPE-1605 interaction kind so it calls `activateHistoricalRouteReplayRegistryForInteractionStart` with persisted `historicalRouteReplayActivationCandidates` and writes `historicalRouteReplays`.

## Ownership audit

| Concern                                   | Existing owner reused by this slice                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| Interaction activator                     | `activateHistoricalRouteReplayRegistryForInteractionStart` / SPE-3033 — unchanged |
| Calendar `absolute_week` activation       | `activateHistoricalRouteReplayRegistryForCalendarWeek` / SPE-3024 — unchanged     |
| Week-close advance                        | SPE-3018 — unchanged; mid-week create of approaching only                         |
| Investigation ask                         | Store `askInvestigationQuestion` → domain `applyAskInvestigationQuestion`         |
| SPE-1605 `interview_witness` signal       | **This slice** — `interactionKind: 'interview_witness'`, `interactionId: questionId` |
| SPE-1605 `enter_zone` site visit          | SPE-3034 / store `recordSceneVisit` — unchanged                                   |

## Owned store wire

- Existing store action: store `askInvestigationQuestion`
- SPE-1605 kind: `interview_witness`
- Signal: `{ interactionKind: 'interview_witness', interactionId: <trimmed questionId> }`
- Gate: fire only when `applyAskInvestigationQuestion` returns `applied: true` (invalid case, invalid question, exhausted budget, already asked, and `canAskInvestigationQuestionOnCase` reject stay no-ops)
- Candidates: persisted `historicalRouteReplayActivationCandidates`
- Graphs: SPE-3027 dual-read via `normalizeHistoricalRouteMemoryGraphsFromGameState`
- Persist: write activator result to `historicalRouteReplays`
- Timing: mid-week create of `approaching` only; SPE-3018 advance stays week-close
- Kind choice: `search` is the worse fit — the ask command spends a question budget across forensic/tactical catalogs; it is not a location search

## Scope

- Thinnest store call into the SPE-3033 activator from `askInvestigationQuestion` after a successful apply.
- Targeted Vitest + slice doc + backlog handoff; retarget SPE-3034 Deferred row 1 for this wire.
- No new GameState field. No save version bump. No UI redesign.

## Boundaries

Not implemented here:

- SPE-3033 activator semantic rewrite
- SPE-3024 calendar helper rewrite
- SPE-3018 advance / SPE-3020 resolve
- SPE-3034 `enter_zone` / `recordSceneVisit` semantic change
- Full SPE-1605 dormant/armed/spent/recurring state machine
- Wiring remaining SPE-1605 kinds (`make_noise`, `operate_control`, `open_access`, `search`, `remove_asset`, `touch_sensitive_object`)
- Anniversary / week-of-year / seasonal start conditions
- UI redesign / new interaction taxonomy
- Parent SPE-1605 closure

## Acceptance

- [ ] Matching applied ask (`interview_witness` + authored questionId) + active SPE-1392 graph writes an `approaching` persisted replay.
- [ ] Different questionId (applied or not) OR rejected ask leaves the registry frozen.
- [ ] Rejected ask does not activate even when a matching candidate exists.
- [ ] Calendar week-close still ignores interaction-only `interview_witness` candidates.
- [ ] Mid-week call does not advance the replay (approaching only).
- [ ] Slice doc, backlog handoff/manifest, SPE-3034 Deferred row 1 retargeted for this wire.
- [ ] Parent SPE-1605 remains **Backlog**.

## Validation

- `npm run test:run -- src/app/store/gameStore.test.ts`
- `npm run test:run -- src/test/historicalRouteReplayActivation.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`

## Deferred

| Item                                                                                         | Suggested owner issue           | Why deferred                                                                 |
| -------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------- |
| Wire remaining SPE-1605 kinds (`make_noise`, `operate_control`, `open_access`, `search`, `remove_asset`, `touch_sensitive_object`) | Later SPE-1605 child            | This child owns only `interview_witness` / `askInvestigationQuestion`.       |
| Full SPE-1605 dormant/armed/spent/recurring state machine                                    | Later SPE-1605 child            | Out of this store-wire boundary.                                             |
| Anniversary / week-of-year / seasonal start conditions                                       | Later SPE-1071 / SPE-1605 child | Outside this interaction wire; calendar absolute week remains SPE-3024.      |
