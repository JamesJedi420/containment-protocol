# SPE-3018 — Advance historical-route replays at campaign week-close

| Field                     | Value                                                                                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                | **In progress**                                                                                                                                                                           |
| **Linear**                | [SPE-3018](https://linear.app/spectranoir/issue/SPE-3018/advance-persisted-historical-route-replays-at-campaign-week-close)                                                               |
| **Parent / lineage**      | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — remains Backlog                                                                               |
| **Prerequisite persistence** | [SPE-3017](https://linear.app/spectranoir/issue/SPE-3017/persist-historical-route-replay-registries-with-fail-closed) — sanitize/hydrate unchanged                                     |
| **Prerequisite contract** | [SPE-3009](https://linear.app/spectranoir/issue/SPE-3009/replay-one-zone-spanning-event-over-a-reactivated-historical-route) — pure advance helpers unchanged                           |
| **Week-close pattern**    | [SPE-2741](https://linear.app/spectranoir/issue/SPE-2741/persist-rival-expeditions-and-advance-them-at-campaign-week-close) — post-calendar registry orchestrator wire                   |
| **Branch**                | `cursor/spe-1606-historical-route-replay-week-close-1999`                                                                                                                                 |
| **Base `main` SHA**       | `774924a83987de6892235dc71f998e4ac67f2022`                                                                                                                                                |

## Goal

At campaign week-close, advance every eligible persisted `HistoricalRouteReplayRecord` in `GameState.historicalRouteReplays` exactly once via SPE-3009 `advanceHistoricalRouteReplay`, with deterministic `eventId` ordering and terminal/ended idempotency. This satisfies the first SPE-3017 Deferred row without UI, calendar activation, SPE-950 possession, SPE-3007 fallback, or auto terminal→ended consequence invent.

## Ownership audit

| Concern                                        | Existing owner reused by this slice                            |
| ---------------------------------------------- | -------------------------------------------------------------- |
| Replay freeze / advance / intercept / terminal | `src/domain/historicalRouteReplay.ts` / SPE-3009               |
| Canonical registry sanitize                    | `normalizeHistoricalRouteReplayRegistry` / SPE-3017            |
| Campaign calendar                              | `GameState.week` and `src/domain/sim/advanceWeek.ts`           |
| Week-close orchestration pattern               | SPE-2741 rival registry wire after calendar                    |

## Scope

- Add pure `advanceHistoricalRouteReplayRegistryAtWeekClose` in `src/domain/historicalRouteReplay.ts`.
- Normalize via SPE-3017, advance each sibling once via SPE-3009, re-normalize in deterministic code-unit `eventId` order.
- Wire into `advanceWeek` immediately after the SPE-2741 rival block.
- Eligible `approaching` / `traversing` move one frozen edge; `terminal` / `ended` stay identity no-ops.
- Do not call `resolveHistoricalRouteReplayTerminal`.
- Point SPE-3017 / SPE-3009 Deferred week-close rows at SPE-3018.
- SCHEMA_REGISTRY note. No store/save version bump.

## Boundaries

Not implemented here:

- SPE-3009 transition helper semantic changes
- SPE-3017 sanitize/`normalizeHistoricalRouteReplayRegistry` semantic changes
- Auto terminal → ended + ordinary-world consequence invent
- SPE-1080 UI / presentation
- SPE-1605 / SPE-1071 calendar or start-condition activation
- SPE-950 possession / role-script reenactments
- SPE-3007 `route_link` or facility adjacency invent
- SPE-2991 effect-instance lifecycle
- Mid-week advancement paths (single `advanceWeek` wire only)
- `lastAdvancedWeek` field (would require sanitize/helper changes)

## Acceptance

- [x] One and multiple persisted replays advance exactly one edge each in deterministic `eventId` order on a single `advanceWeek`.
- [x] `terminal` / `ended` records remain immutable no-ops across repeated orchestrator / week-close calls.
- [x] Frozen route arrays are unchanged; week-close never invents facility or `route_link` edges.
- [x] Unrelated week-close state matches a baseline with empty/no replay registry.
- [x] Empty / omitted registry remains empty after week-close.
- [x] No UI, calendar activation, SPE-950 possession, SPE-3007 fallback, or SPE-2991 lifecycle.
- [x] Slice doc, backlog handoff/manifest, and SCHEMA_REGISTRY updated in-boundary.
- [x] Parent SPE-1606 remains **Backlog**.

## Validation

- `npm run test:run -- src/test/historicalRouteReplayWeekClose.contract.test.ts src/test/historicalRouteReplay.contract.test.ts src/test/historicalRouteReplayPersistence.contract.test.ts`
- `npm run lint`
- `npm run verify:audits-index`
- `npm run verify:backlog-handoff`
- `npm run verify:theme-contracts`
- `npm run test:run:ci`

## Deferred

| Item                                               | Suggested owner issue                                                                                                                                                                               | Why deferred                                                                                        |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Auto terminal → ended + ordinary consequence       | Later SPE-1606 child                                                                                                                                                                                | Consequence IDs need an explicit owner; week-close must not invent them.                            |
| Player-facing replay/map/explanation surfacing     | [SPE-1080](https://linear.app/spectranoir/issue/SPE-1080/presentation-accessibility-and-simulation-explainability) with a bounded SPE-1606 integration child                                        | Presentation must consume canonical replay state rather than owning route/causality logic.          |
| Automatic calendar/time/interaction activation     | [SPE-1605](https://linear.app/spectranoir/issue/SPE-1605/scenario-event-start-conditions) / [SPE-1071](https://linear.app/spectranoir/issue/SPE-1071/calendar-seasonal-cycle-and-time-gated-events) | Activation policy stays with start-condition/calendar owners.                                       |
| SPE-1392 graph persistence on `GameState`          | Separate SPE-1392 / SPE-1606 follow-on if required                                                                                                                                                  | Replay records carry frozen route arrays; live graph storage is a distinct boundary.                |
