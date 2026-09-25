# SPE-3017 — Persist historical-route replay registries

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Linear** | [SPE-3017](https://linear.app/spectranoir/issue/SPE-3017/persist-historical-route-replay-registries-with-fail-closed) |
| **Parent / lineage** | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — remains Backlog |
| **Prerequisite contract** | [SPE-3009](https://linear.app/spectranoir/issue/SPE-3009/replay-one-zone-spanning-event-over-a-reactivated-historical-route) — pure freeze/replay helpers unchanged |
| **Convention reference** | [SPE-2991](https://linear.app/spectranoir/issue/SPE-2991/active-anomaly-effect-instance-lifecycle-and-persistence) — sanitize/hydrate conventions only; do not reopen effect-instance lifecycle |
| **Prerequisite data** | [SPE-1392](https://linear.app/spectranoir/issue/SPE-1392/historical-route-memory-and-nonlocal-edge-graph) — frozen route arrays originate from active-path resolution at creation |
| **Branch** | `cursor/spe-1606-historical-route-replay-persistence-1999` |
| **Base `main` SHA** | `11b2bba47a443c2eaa7e425498018aaf167abc5e` |

## Goal

Persist canonical `HistoricalRouteReplayRecord` registries on `GameState` with fail-closed sanitize, hydrate, and migration. This satisfies the first SPE-3009 Deferred row without week-close, UI, calendar activation, SPE-950 possession, or SPE-3007 fallback.

## Ownership audit

| Concern | Existing owner reused by this slice |
| --- | --- |
| Replay freeze / advance / intercept / terminal | `src/domain/historicalRouteReplay.ts` / SPE-3009 |
| Historical path resolution at creation | `src/domain/historicalRouteMemory.ts` / SPE-1392 |
| Canonical runtime normalization | `normalizeGameState` in `src/domain/teamSimulation.ts` |
| Hydration and run transfer | `src/app/store/runTransfer.ts` |
| Manual save envelope | `src/app/store/saveSystem.ts`; `GAME_SAVE_VERSION` remains `1` |
| Registry sanitize pattern | SPE-2741 rival-expedition registries; SPE-2991 conventions |

## Scope

- Add optional canonical `GameState.historicalRouteReplays` keyed by embedded `eventId`.
- Empty starting-state and legacy-omit hydration defaults.
- Fail-closed normalize: drop malformed, key-mismatched, integer-index, and internally inconsistent siblings independently; preserve valid siblings in deterministic code-unit `eventId` order.
- Validate frozen route anchors/edges, phase/index consistency, observer exposures, ordinary-world consequence, and exact `causalClassification: unresolved` without inventing edges.
- SCHEMA_REGISTRY entry. No store/save version bump.
- Point the SPE-3009 Deferred persistence row at SPE-3017.

## Boundaries

Not implemented here:

- SPE-3009 transition helper semantic changes
- Week-close advancement/orchestration
- SPE-1080 UI / presentation
- SPE-1605 / SPE-1071 calendar or start-condition activation
- SPE-950 possession / role-script reenactments
- SPE-3007 `route_link` or facility adjacency invent on hydrate
- SPE-2991 effect-instance lifecycle
- Live SPE-1392 graph persistence on `GameState`

## Acceptance

- [x] New and hydrated legacy games expose an empty replay registry.
- [x] Valid records round-trip through normalize/hydrate/save without envelope version change.
- [x] Malformed, orphan-inconsistent, key-mismatched, and integer-index siblings fail closed.
- [x] Frozen route arrays and `causalClassification: unresolved` preserve across sanitize/hydrate.
- [x] Hydrate never invents `route_link` or facility adjacency edges.
- [x] No week-close hook, UI, calendar activation, SPE-950 possession, or SPE-3007 fallback.
- [x] Slice doc, backlog handoff/manifest, and SCHEMA_REGISTRY updated in-boundary.

## Validation

- `npm run test:run -- src/test/historicalRouteReplayPersistence.contract.test.ts src/test/historicalRouteReplay.contract.test.ts`
- `npm run lint`
- `npm run verify:audits-index`
- `npm run verify:backlog-handoff`
- `npm run verify:theme-contracts`
- `npm run test:run:ci`

## Deferred

| Item | Suggested owner issue | Why deferred |
| --- | --- | --- |
| Authoritative week-close advancement/orchestration | New SPE-1606 child | Persistence only; does not choose when campaign time advances a replay. |
| Player-facing replay/map/explanation surfacing | [SPE-1080](https://linear.app/spectranoir/issue/SPE-1080/presentation-accessibility-and-simulation-explainability) with a bounded SPE-1606 integration child | Presentation must consume canonical replay state rather than owning route/causality logic. |
| Automatic calendar/time/interaction activation | [SPE-1605](https://linear.app/spectranoir/issue/SPE-1605/scenario-event-start-conditions) / [SPE-1071](https://linear.app/spectranoir/issue/SPE-1071/calendar-seasonal-cycle-and-time-gated-events) | Activation policy stays with start-condition/calendar owners. |
| SPE-1392 graph persistence on `GameState` | Separate SPE-1392 / SPE-1606 follow-on if required | Hydrate validates frozen route arrays as self-contained; live graph storage is a distinct boundary. |
