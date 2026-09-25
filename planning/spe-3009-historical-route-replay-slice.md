# SPE-3009 — Historical route replay over a reactivated route

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Linear** | [SPE-3009](https://linear.app/spectranoir/issue/SPE-3009/replay-one-zone-spanning-event-over-a-reactivated-historical-route) |
| **Parent / lineage** | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — remains Backlog |
| **Prerequisite** | [SPE-1392](https://linear.app/spectranoir/issue/SPE-1392/historical-route-memory-and-nonlocal-edge-graph) — merged in PR #3832; malformed-observation fail-closed hardening landed via SPE-3011 / PR #3837 |
| **Boundary** | [SPE-950](https://linear.app/spectranoir/issue/SPE-950/reenactment-hauntings-and-scripted-possession-loops) retains possession/role-script reenactments; [SPE-3007](https://linear.app/spectranoir/issue/SPE-3007/spread-one-zone-spanning-event-by-route-link) retains present facility route-link spread |
| **Branch** | `cursor/spe-3009-historical-route-replay` |
| **Base `main` SHA** | `df576a56a067021c0cf2f955607ae008e43ada13` |

## Goal

Consume one active SPE-1392 historical/nonlocal route as an ordered event path. The event approaches on that path, can be intercepted at its current route position, exposes a stronger post-contact observation state, continues to a configured historical terminal, and can leave an ordinary-world consequence while causal classification remains unresolved.

## Requirements reference — *The Phantom Coach*

The stress-test sequence is represented mechanically as:

1. old road / historical edge → active SPE-1392 path
2. approaching coach → replay phase `approaching` at the origin
3. boarding/contact → explicit observer interception at `currentAnchorId`
4. altered interior evidence → observer `post_contact / altered` state
5. historical crash location → configured `terminalAnchorId`
6. recovered injury with disputed explanation → `ordinary_world` consequence + `causalClassification: unresolved`

This is a design fixture, not a claim that the literary event has one canonical supernatural explanation.

## Contract

`src/domain/historicalRouteReplay.ts` owns a pure, immutable replay record.

- Creation calls `resolveActiveHistoricalRoutePath` from SPE-1392 exactly once and fails closed if no active route resolves.
- `historical_route` is a separate SPE-1606 propagation family record rather than a new `ZoneSpanningPropagationRule`, because that existing union is scoped to the facility section graph and its present-day authored propagation sources.
- The resolved ordered anchors/edges are fixed on the replay record; advancement never discovers or invents a different edge.
- `currentAnchorId`, route index, traversed anchors/edges, affected anchors, observer-exposed anchors, and terminal anchor are explicit and separate.
- Observer contact is permitted only at the event's current route position; contact writes `exposedAnchorIds` without changing route progression.
- Post-contact evidence can strengthen without changing route progression.
- Terminal resolution emits one retained ordinary-world consequence while causality stays `unresolved`.

## Boundaries

Not implemented here:

- SPE-3007 `route_link` fallback or facility adjacency reads
- actor movement/pathfinding or teleportation
- role assignment, historical identity substitution, forced dialogue, possession state, emotional-fit casting, manifested props, or alternate dramatic closures from SPE-950
- intelligence, hostility, motive, or observer-reactive route choice
- GameState persistence, event-schema registration, UI, week-close wiring, or automatic calendar activation
- universal paranormal rules

## Deferred

| Item | Suggested owner issue | Why deferred |
| --- | --- | --- |
| Durable replay persistence, schema registration, hydration, and migration | [SPE-3017](https://linear.app/spectranoir/issue/SPE-3017/persist-historical-route-replay-registries-with-fail-closed) under [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation); consumes persistence conventions from [SPE-2991](https://linear.app/spectranoir/issue/SPE-2991/active-anomaly-effect-instance-lifecycle-and-persistence) | This slice proves only the pure replay contract. Durable storage and migration require a separate persisted-state boundary and must not be smuggled into the route kernel. |
| Player-facing replay/map/explanation surfacing | [SPE-1080](https://linear.app/spectranoir/issue/SPE-1080/presentation-accessibility-and-simulation-explainability) with a bounded SPE-1606 integration child | Presentation must consume the canonical replay state rather than adding UI-owned route or causality logic. |
| Authoritative week-close advancement/orchestration | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) follow-on child | This slice exposes pure transition functions only; it does not choose when campaign time advances a replay. |
| Automatic calendar/time/interaction activation | [SPE-1605](https://linear.app/spectranoir/issue/SPE-1605/scenario-event-start-conditions) and [SPE-1071](https://linear.app/spectranoir/issue/SPE-1071/calendar-seasonal-cycle-and-time-gated-events) | Start-condition and calendar ownership must decide when an SPE-1392 route becomes replay-active; SPE-3009 must not invent activation policy. |

## Fail-closed behavior

- Missing or inactive SPE-1392 path → no replay record.
- Origin equal to terminal → no replay record.
- Observer not at `currentAnchorId` → no exposure write.
- Repeated observer interception → no duplicate exposure.
- Advance at terminal/end → same record.
- Terminal consequence before the configured terminal → same record.
- Malformed consequence identity/kind → same record.

## Validation

Targeted contract coverage: `src/test/historicalRouteReplay.contract.test.ts`.

Repository validation before merge:

- `npm run lint`
- `npm run verify:audits-index`
- `npm run verify:backlog-handoff`
- `npm run verify:theme-contracts`
- `npm run test:run:ci`
