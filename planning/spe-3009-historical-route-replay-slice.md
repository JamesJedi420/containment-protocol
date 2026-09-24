# SPE-3009 — Historical route replay over a reactivated route

| Field | Value |
| --- | --- |
| **Status** | **In review** |
| **Linear** | [SPE-3009](https://linear.app/spectranoir/issue/SPE-3009/replay-one-zone-spanning-event-over-a-reactivated-historical-route) |
| **Parent / lineage** | [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606/zone-spanning-event-propagation) — remains Backlog |
| **Prerequisite** | [SPE-1392](https://linear.app/spectranoir/issue/SPE-1392/historical-route-memory-and-nonlocal-edge-graph) — merged in PR #3832; malformed-observation fail-closed hardening landed via SPE-3011 / PR #3837 |
| **Boundary** | [SPE-950](https://linear.app/spectranoir/issue/SPE-950/reenactment-hauntings-and-scripted-possession-loops) retains possession/role-script reenactments; [SPE-3007](https://linear.app/spectranoir/issue/SPE-3007/spread-one-zone-spanning-event-by-route-link) retains present facility route-link spread |
| **Branch** | `cursor/spe-3009-historical-route-replay` |
| **Base `main` SHA** | `c13caaaf1517bc86458ad7901b0dac18884b83d8` |

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
