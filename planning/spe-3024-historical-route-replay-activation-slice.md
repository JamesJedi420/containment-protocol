# SPE-3024 — Activate historical-route replays from calendar/start-condition policy

| Field                        | Value                                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                   | **Recently shipped**                                                                                                                                                                  |
| **Linear**                   | [SPE-3024](https://linear.app/spectranoir/issue/SPE-3024/activate-historical-route-replays-from-calendarstart-condition-policy)                                                       |
| **Parent / lineage**         | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — remains Backlog                                                                           |
| **Activation owners**        | [SPE-1605](https://linear.app/spectranoir/issue/SPE-1605/scenario-event-start-conditions) / [SPE-1071](https://linear.app/spectranoir/issue/SPE-1071/calendar-seasonal-cycle-and-time-gated-events) |
| **Prerequisite create**      | [SPE-3009](https://linear.app/spectranoir/issue/SPE-3009/replay-one-zone-spanning-event-over-a-reactivated-historical-route) — `createHistoricalRouteReplay` unchanged               |
| **Prerequisite persistence** | [SPE-3017](https://linear.app/spectranoir/issue/SPE-3017/persist-historical-route-replay-registries-with-fail-closed) — sanitize/hydrate unchanged                                    |
| **Prerequisite week-close**  | [SPE-3018](https://linear.app/spectranoir/issue/SPE-3018/advance-persisted-historical-route-replays-at-campaign-week-close) / [SPE-3020](https://linear.app/spectranoir/issue/SPE-3020/auto-resolve-historical-route-replay-terminal-ended-with-ordinary) — advance+resolve unchanged beyond post-apply activation |
| **Branch**                   | `cursor/spe-3024-historical-route-replay-activation-8c00`                                                                                                                             |
| **Base `main` SHA**          | `565d259f04ca00a66fc8ddebf31eb5e441395aec`                                                                                                                                            |

## Goal

Decide when an SPE-1392 reactivated route becomes a persisted `HistoricalRouteReplayRecord` using a calendar/start-condition policy owned at the SPE-1605 / SPE-1071 boundary, then insert it into `GameState.historicalRouteReplays` via SPE-3017 normalize. This satisfies the SPE-3020 Deferred activation row without UI, SPE-950 possession, SPE-3007 invent, or SPE-3020 consequence-policy changes.

## Ownership audit

| Concern                                      | Existing owner reused by this slice                                      |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| Replay create (fail-closed inactive path)    | `createHistoricalRouteReplay` / SPE-3009                                 |
| Canonical registry sanitize                  | `normalizeHistoricalRouteReplayRegistry` / SPE-3017                      |
| Week-close advance + terminal resolve        | `applyHistoricalRouteReplayRegistryAtWeekClose` / SPE-3018 + SPE-3020    |
| Campaign absolute week                       | `GameState.week` / SPE-1071 `CampaignDate.absoluteWeek`                  |
| Calendar/start-condition activation policy   | **This slice** — `activateHistoricalRouteReplayRegistryForCalendarWeek`  |
| SPE-1392 path resolution                     | `resolveActiveHistoricalRoutePath` / SPE-1392                            |

## Owned start-condition policy

Week-close activation owns these fields:

- Start condition kind: `absolute_week` (`HISTORICAL_ROUTE_REPLAY_ABSOLUTE_WEEK_START`)
- Match rule: `startCondition.absoluteWeek ===` closing `GameState.week`
- Create path: SPE-3009 `createHistoricalRouteReplay` only (no edge invent)
- Ordering: deterministic code-unit `eventId`
- Idempotency: existing registry siblings for the same `eventId` stay unchanged
- Timing: activate **after** SPE-3018/3020 apply so newly created records remain `approaching` until the next week-close advance

Does not invent mid-week interaction triggers, SPE-950 possession subjects, or SPE-3007 adjacency.

## Scope

- Add `historicalRouteReplayActivation.ts` with candidate normalize + calendar activation orchestrator.
- Add fail-closed `normalizeHistoricalRouteMemoryGraph` for the optional activation graph input (not the full SPE-1392 multi-site persistence program).
- Optional `GameState.historicalRouteReplayActivationCandidates` and `GameState.historicalRouteMemoryGraph`.
- Wire `advanceWeek` after SPE-3018/3020 apply.
- Point SPE-3020 Deferred activation row at SPE-3024.
- SCHEMA_REGISTRY note. No store/save version bump.

## Boundaries

Not implemented here:

- SPE-3009 / SPE-3017 / SPE-3018 / SPE-3020 semantic changes
- SPE-1080 UI / presentation
- Mid-week interaction start triggers (later SPE-1605 child)
- Full multi-site SPE-1392 graph persistence/migration program
- SPE-950 possession / role-script reenactments
- SPE-3007 `route_link` or facility adjacency invent
- SPE-2991 effect-instance lifecycle

## Acceptance

- [x] Matching `absolute_week` + active SPE-1392 path creates an `approaching` persisted replay.
- [x] Inactive/missing SPE-1392 path creates nothing (fail-closed).
- [x] Re-activation for an existing `eventId` is idempotent.
- [x] Week-close still advances/resolves existing replays per SPE-3018/3020.
- [x] Unrelated week-close state matches empty-activation baseline (isolation).
- [x] No UI, SPE-950 possession, SPE-3007 invent, or SPE-3020 consequence-policy changes.
- [x] Slice doc, backlog handoff/manifest, and SCHEMA_REGISTRY updated in-boundary.
- [x] Parent SPE-1606 remains **Backlog**.

## Validation

- `npm run test:run -- src/test/historicalRouteReplayActivation.contract.test.ts src/test/historicalRouteReplayTerminalResolveWeekClose.contract.test.ts src/test/historicalRouteReplayWeekClose.contract.test.ts src/test/historicalRouteReplay.contract.test.ts src/test/historicalRouteReplayPersistence.contract.test.ts`
- `npm run lint`
- `npm run verify:audits-index`
- `npm run verify:backlog-handoff`
- `npm run verify:theme-contracts`
- `npm run test:run:ci`

## Deferred

| Item                                                    | Suggested owner issue                                                                                                                                                                               | Why deferred                                                                                       |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Player-facing replay/map/explanation surfacing          | [SPE-1080](https://linear.app/spectranoir/issue/SPE-1080/presentation-accessibility-and-simulation-explainability) with a bounded SPE-1606 integration child                                        | Presentation must consume canonical replay state rather than owning route/causality logic.         |
| Interaction-triggered mid-week starts                   | Later [SPE-1605](https://linear.app/spectranoir/issue/SPE-1605/scenario-event-start-conditions) child                                                                                               | This child owns calendar `absolute_week` only; interaction starts need a mid-week seam.            |
| Full SPE-1392 multi-site graph persistence/migration    | Separate SPE-1392 / SPE-1606 follow-on                                                                                                                                                              | This child only hydrates one optional activation graph input fail-closed.                          |
| Anniversary / week-of-year / seasonal start conditions  | Later SPE-1071 / SPE-1605 child                                                                                                                                                                     | Slice-1 calendar absolute week is enough for the SPE-3020 activation Deferred row.                 |
