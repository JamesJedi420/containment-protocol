# SPE-3027 — Persist multi-site SPE-1392 historical-route memory graphs

| Field                 | Value                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**            | **In progress**                                                                                                                                                                 |
| **Linear**            | [SPE-3027](https://linear.app/spectranoir/issue/SPE-3027/persist-multi-site-spe-1392-historical-route-memory-graphs-on)                                                         |
| **Parent / lineage**  | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — remains Backlog                                                                     |
| **Related**           | [SPE-1392](https://linear.app/spectranoir/issue/SPE-1392/historical-route-memory-and-nonlocal-edge-graph) (domain graph Done; persistence was out of scope)                     |
| **Deferred source**   | [SPE-3024](https://linear.app/spectranoir/issue/SPE-3024/activate-historical-route-replays-from-calendarstart-condition-policy) Deferred — *Full SPE-1392 multi-site graph persistence/migration* |
| **Prerequisite**      | SPE-1392 `normalizeHistoricalRouteMemoryGraph`; SPE-3024 calendar activation; SPE-3017 registry pattern                                                                         |
| **Branch**            | `cursor/spe-3027-historical-route-memory-graph-persistence-0b59`                                                                                                                |
| **Base `main` SHA**   | `bd5049a74aeaa17d7e18ccd4730a54710f5917d9`                                                                                                                                      |

## Goal

Ship a deterministic multi-site registry of SPE-1392 historical-route memory graphs on `GameState` with fail-closed sanitize/hydrate/migration, so multiple sites retain remembered anchors/edges across save/load. Replace SPE-3024's single optional activation graph with one authoritative store that activation reads by `siteId`.

## Ownership audit

| Concern                                      | Existing owner reused by this slice                                      |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| Per-site graph fail-closed sanitize          | `normalizeHistoricalRouteMemoryGraph` / SPE-1392 + SPE-3024              |
| Replay create (fail-closed inactive path)    | `createHistoricalRouteReplay` / SPE-3009 — unchanged                     |
| Calendar activation policy                   | `activateHistoricalRouteReplayRegistryForCalendarWeek` / SPE-3024        |
| Registry sanitize pattern                    | SPE-3017 / SPE-2741 keyed registries                                     |
| Hydration and run transfer                   | `hydrateGame` in `src/app/store/runTransfer.ts`                          |
| Canonical runtime normalization              | `normalizeGameState` in `src/domain/teamSimulation.ts`                   |

## Scope

- Add optional `GameState.historicalRouteMemoryGraphs` keyed by embedded `siteId`.
- Reuse `normalizeHistoricalRouteMemoryGraph` per site; drop malformed / key-mismatched / integer-index siblings independently.
- Migrate SPE-3024 single optional `historicalRouteMemoryGraph` into the registry (dual-read → canonicalize under `graph.siteId`; registry entry wins on collision).
- Wire hydrate/normalize in `runTransfer` and `normalizeGameState`; week-close preserves the registry and drops the legacy single field.
- Wire SPE-3024 activation to read the multi-site registry (deterministic `siteId` order until SPE-3009 create succeeds).
- Targeted Vitest + slice doc + backlog handoff; point SPE-3024 Deferred row at SPE-3027.
- SCHEMA_REGISTRY note. No store/save version bump.

## Constraints

- Deterministic only.
- Do not change SPE-3009 / SPE-3017 / SPE-3018 / SPE-3020 / SPE-3024 activation **semantics** beyond persistence ownership.
- Do not implement SPE-3026 UI / explanation projection.
- Do not invent SPE-1080 presentation, SPE-950 possession, SPE-3007 `route_link`, mid-week interaction activation, actor movement/teleport/pathfinding, or facility topology mutation.
- No broad `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` bump.

## Acceptance

- [x] Multiple sites persist independent SPE-1392 memory graphs on GameState across save/load.
- [x] Malformed site entries / graphs fail-closed (dropped).
- [x] Saves with only SPE-3024 single `historicalRouteMemoryGraph` migrate into the multi-site registry.
- [x] SPE-3024 calendar activation still creates approaching replays when a site graph in the registry has an active path.
- [x] Slice doc, backlog handoff/manifest, and SCHEMA_REGISTRY updated in-boundary.
- [x] Parent SPE-1606 remains **Backlog**.

## Validation

- `npm run test:run -- src/test/historicalRouteMemoryGraphPersistence.contract.test.ts src/test/historicalRouteReplayActivation.contract.test.ts src/test/historicalRouteMemory.contract.test.ts src/test/historicalRouteReplayPersistence.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run verify:audits-index`
- `npm run verify:theme-contracts`
- `npm run test:run:ci` (before merge)

## Deferred

| Item                                           | Suggested owner issue                                                                                                                                                                | Why deferred                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Player-facing replay/map/explanation surfacing | [SPE-3026](https://linear.app/spectranoir/issue/SPE-3026/project-historical-route-replays-into-a-bounded-player-facing) under SPE-1080 / SPE-1606                                     | Presentation must consume canonical replay + graph state; not this persist.  |
| Interaction-triggered mid-week starts          | Later [SPE-1605](https://linear.app/spectranoir/issue/SPE-1605/scenario-event-start-conditions) child                                                                                 | Calendar `absolute_week` activation already ships via SPE-3024.              |
| Anniversary / week-of-year / seasonal starts   | Later SPE-1071 / SPE-1605 child                                                                                                                                                      | Outside this persistence boundary.                                           |
| Authoring tools that write multi-site graphs   | Later SPE-1392 / SPE-1606 child                                                                                                                                                      | This slice owns persist/hydrate; writers remain explicit callers.            |
