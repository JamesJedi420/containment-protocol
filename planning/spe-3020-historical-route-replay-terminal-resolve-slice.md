# SPE-3020 — Auto-resolve historical-route replay terminal at week-close

| Field                        | Value                                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                   | **Recently shipped**                                                                                                                                                                  |
| **Linear**                   | [SPE-3020](https://linear.app/spectranoir/issue/SPE-3020/auto-resolve-historical-route-replay-terminal-ended-with-ordinary)                                                           |
| **Parent / lineage**         | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — remains Backlog                                                                           |
| **Prerequisite week-close**  | [SPE-3018](https://linear.app/spectranoir/issue/SPE-3018/advance-persisted-historical-route-replays-at-campaign-week-close) — advance-once wire unchanged beyond post-advance resolve |
| **Prerequisite contract**    | [SPE-3009](https://linear.app/spectranoir/issue/SPE-3009/replay-one-zone-spanning-event-over-a-reactivated-historical-route) — `resolveHistoricalRouteReplayTerminal` unchanged       |
| **Prerequisite persistence** | [SPE-3017](https://linear.app/spectranoir/issue/SPE-3017/persist-historical-route-replay-registries-with-fail-closed) — sanitize/hydrate unchanged                                    |
| **Branch**                   | `cursor/spe-1606-historical-route-replay-terminal-resolve-c184`                                                                                                                       |
| **Base `main` SHA**          | `087b78e2da0efab9c57e11040bc12ee43448117f`                                                                                                                                            |

## Goal

After SPE-3018 advance at campaign week-close, resolve every `HistoricalRouteReplayRecord` that lands on or already sits at `terminal` via SPE-3009 `resolveHistoricalRouteReplayTerminal`, using an explicit owned consequence-id policy, so the record becomes `ended` with one ordinary-world consequence. Causality stays `unresolved`. This satisfies the first SPE-3018 Deferred row without UI, activation, SPE-950 possession, or SPE-3007 invent.

## Ownership audit

| Concern                                 | Existing owner reused by this slice                              |
| --------------------------------------- | ---------------------------------------------------------------- |
| Terminal → ended + ordinary consequence | `resolveHistoricalRouteReplayTerminal` / SPE-3009                |
| Week-close advance-once                 | `advanceHistoricalRouteReplayRegistryAtWeekClose` / SPE-3018     |
| Canonical registry sanitize             | `normalizeHistoricalRouteReplayRegistry` / SPE-3017              |
| Week-close consequence-id policy        | **This slice** — `ownedHistoricalRouteReplayTerminalConsequence` |
| Campaign calendar                       | `GameState.week` and `src/domain/sim/advanceWeek.ts`             |

## Owned consequence-id policy

Week-close owns these fields for auto-resolve:

- `consequenceId`: `historical-route-replay:${eventId}:terminal-ordinary-consequence`
- `kind`: `historical_route_terminal` (`HISTORICAL_ROUTE_WEEK_CLOSE_TERMINAL_CONSEQUENCE_KIND`)
- `subjectId`: omitted unless the record already has observer exposures; then the first by code-unit `observerId` order

Does not invent SPE-950 possession subjects, SPE-3007 adjacency, or ad-hoc IDs outside this policy.

## Scope

- Add `ownedHistoricalRouteReplayTerminalConsequence`, `resolveHistoricalRouteReplayRegistryTerminalsAtWeekClose`, and `applyHistoricalRouteReplayRegistryAtWeekClose` (advance then resolve).
- Wire `advanceWeek` to call `applyHistoricalRouteReplayRegistryAtWeekClose` in place of advance-only.
- Resolve only after advance in the same close; already-`ended` stays idempotent.
- Point SPE-3018 Deferred terminal-resolve row at SPE-3020.
- SCHEMA_REGISTRY note. No store/save version bump.

## Boundaries

Not implemented here:

- SPE-3009 transition helper semantic changes
- SPE-3017 sanitize/`normalizeHistoricalRouteReplayRegistry` semantic changes
- SPE-3018 advance-once reshape beyond post-advance terminal resolve
- SPE-1080 UI / presentation
- SPE-1605 / SPE-1071 calendar or start-condition activation
- SPE-950 possession / role-script reenactments
- SPE-3007 `route_link` or facility adjacency invent
- SPE-2991 effect-instance lifecycle
- Mid-week resolve paths (single `advanceWeek` wire only)

## Acceptance

- [x] Record that reaches `terminal` on this week's advance becomes `ended` with the owned consequence in the same `advanceWeek`.
- [x] Record already at `terminal` becomes `ended` with the owned consequence on week-close.
- [x] Already-`ended` records remain immutable no-ops across repeated orchestrator / week-close calls.
- [x] Multiple replays resolve in deterministic `eventId` order; unrelated week-close state matches empty-registry baseline.
- [x] Approaching/traversing that do not reach terminal this week are not resolved.
- [x] No UI, calendar activation, SPE-950 possession, SPE-3007 fallback, or SPE-2991 lifecycle.
- [x] Slice doc, backlog handoff/manifest, and SCHEMA_REGISTRY updated in-boundary.
- [x] Parent SPE-1606 remains **Backlog**.

## Validation

- `npm run test:run -- src/test/historicalRouteReplayTerminalResolveWeekClose.contract.test.ts src/test/historicalRouteReplayWeekClose.contract.test.ts src/test/historicalRouteReplay.contract.test.ts src/test/historicalRouteReplayPersistence.contract.test.ts`
- `npm run lint`
- `npm run verify:audits-index`
- `npm run verify:backlog-handoff`
- `npm run verify:theme-contracts`
- `npm run test:run:ci`

## Deferred

| Item                                                    | Suggested owner issue                                                                                                                                                                               | Why deferred                                                                                       |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Player-facing replay/map/explanation surfacing          | [SPE-1080](https://linear.app/spectranoir/issue/SPE-1080/presentation-accessibility-and-simulation-explainability) with a bounded SPE-1606 integration child                                        | Presentation must consume canonical replay state rather than owning route/causality logic.         |
| Automatic calendar/time/interaction activation          | [SPE-1605](https://linear.app/spectranoir/issue/SPE-1605/scenario-event-start-conditions) / [SPE-1071](https://linear.app/spectranoir/issue/SPE-1071/calendar-seasonal-cycle-and-time-gated-events) | Activation policy stays with start-condition/calendar owners.                                      |
| SPE-1392 graph persistence on `GameState`               | Separate SPE-1392 / SPE-1606 follow-on if required                                                                                                                                                  | Replay records carry frozen route arrays; live graph storage is a distinct boundary.               |
| Narrative injury/kind specialization beyond owned token | Later SPE-1606 child if scenario authors need Phantom Coach `physical_injury` tokens at week-close                                                                                                  | Week-close owns only the generic `historical_route_terminal` token; authored kinds stay elsewhere. |
