# SPE-956 — Participatory channel persistence / advisory·async maps (slice 4)

One-page implementation plan. Linear: [SPE-2635](https://linear.app/spectranoir/issue/SPE-2635) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Extends SPE-2632/2633/2634 sanitize/hydrate to one more already-shipped participatory channel envelope. Parent stays **Backlog**.

| Field               | Value                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2635 — Participatory channel persistence — advisory / async maps (slice 4)](https://linear.app/spectranoir/issue/SPE-2635)                 |
| **Status**          | **Shipped** — PR #3180                                                                                                            |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / hotlines / participatory channels; stays **Backlog**              |
| **Branch**          | `spe-956-participatory-channel-persistence-slice-4`                                                                                           |
| **Base `main` SHA** | `2d20e9a6`                                                                                                                                    |

## Goal

Persist at least one additional already-shipped SPE-956 participatory channel envelope on GameState with sanitize/hydrate (SPE-2632–2634 pattern) — async discussion surface records — without evaluator contract changes, week-close coupling, or a full UI/planning mirror.

## Prerequisite (on `main` @ `2d20e9a6`)

| Shipped                        | Anchor                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Survivor informal registry map | [SPE-2632](https://linear.app/spectranoir/issue/SPE-2632) — `spe956ParticipatoryChannelPersistence.ts` |
| Collective memory channel map  | [SPE-2633](https://linear.app/spectranoir/issue/SPE-2633) — same module                                |
| Hotline channel map            | [SPE-2634](https://linear.app/spectranoir/issue/SPE-2634) — same module                                |
| Async discussion evaluator     | [SPE-2629](https://linear.app/spectranoir/issue/SPE-2629) — `asyncDiscussionSurface.ts`                |
| Hydrate wiring                 | `runTransfer.ts` — `hydrateGame`                                                                        |

## Channel choice (slice 4)

| Choice                         | Rationale                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Async discussion surface**   | Nested `participationWindow` `{startWeek,endWeek}` + two enums + boolean; smaller than advisory arrays/threshold |
| Deferred sibling               | Community advisory body (string arrays + `authorizedDecisionScopes` enums + `influenceThreshold`) stays later  |

## Scope

| In                                                                   | Out                                               |
| -------------------------------------------------------------------- | ------------------------------------------------- |
| `spe956AsyncDiscussionSurfaceRecords` GameState map                  | Advisory body channel map                         |
| Extend `spe956ParticipatoryChannelPersistence.ts` sanitize/hydrate   | SPE-2620/2628/2629/2630/2631 evaluator rewrites   |
| `runTransfer` hydrate wiring + starting-state `{}`                   | Week-close tick; store actions; UI / mirror       |
| Round-trip + empty/missing normalize tests                           | SPE-1682 / SPE-860 / SPE-911 / SPE-875 expansions |
| Slice doc + SCHEMA_REGISTRY note + backlog handoff                   | Full SPE-956 parent AC                            |

## Acceptance

- [x] Empty default `{}` hydrates safely (legacy/missing saves no-op)
- [x] Invalid async surface entries dropped without throw (bad window, enum, field)
- [x] sanitize/hydrate round-trip through save/load and `hydrateGame`
- [x] Hydrated channel shape is frozen / immutable for EXAMPLE fixture (incl. nested window)
- [x] SPE-2629 evaluator contract unchanged
- [x] SPE-956 remains **Backlog**
- [x] `npm run lint` + targeted tests green

## Deferred

| Item                                              | Suggested owner | Why deferred                         |
| ------------------------------------------------- | --------------- | ------------------------------------ |
| Community advisory body channel map               | [SPE-2636](https://linear.app/spectranoir/issue/SPE-2636) | Arrays + threshold; after async map — **in progress** (slice 5) |
| UI / planning mirror                              | SPE-956 sibling | After persistence                    |
| Week-close channel tick                           | SPE-956 sibling | Not required this slice              |
| Compose/evaluate-from-GameState helpers (broader) | SPE-956 sibling | Optional read helpers                |

## Validation

- `npm.cmd run test:run -- src/test/spe956ParticipatoryChannelPersistence.test.ts`
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`

## See also

- `planning/spe-956-participatory-channel-persistence-slice-1.md`
- `planning/spe-956-participatory-channel-persistence-slice-2.md`
- `planning/spe-956-participatory-channel-persistence-slice-3.md`
- `planning/spe-956-async-discussion-surface-slice-1.md`
- `SCHEMA_REGISTRY.md` — SPE-956 participatory channel persistence section
