# SPE-956 — Participatory channel persistence / advisory·hotline·async maps (slice 3)

One-page implementation plan. Linear: [SPE-2634](https://linear.app/spectranoir/issue/SPE-2634) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Extends SPE-2632/2633 sanitize/hydrate to one more already-shipped participatory channel envelope. Parent stays **Backlog**.

| Field               | Value                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2634 — Participatory channel persistence — advisory / hotline / async maps (slice 3)](https://linear.app/spectranoir/issue/SPE-2634) |
| **Status**          | **Ready for PR**                                                                                                                        |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / hotlines / participatory channels; stays **Backlog**        |
| **Branch**          | `spe-956-participatory-channel-persistence-slice-3`                                                                                     |
| **Base `main` SHA** | `679f46b1`                                                                                                                              |

## Goal

Persist at least one additional already-shipped SPE-956 participatory channel envelope on GameState with sanitize/hydrate (SPE-2632/2633 pattern) — private hotline channel records — without evaluator contract changes, week-close coupling, or a full UI/planning mirror.

## Prerequisite (on `main` @ `679f46b1`)

| Shipped                        | Anchor                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| Survivor informal registry map | [SPE-2632](https://linear.app/spectranoir/issue/SPE-2632) — `spe956ParticipatoryChannelPersistence.ts` |
| Collective memory channel map  | [SPE-2633](https://linear.app/spectranoir/issue/SPE-2633) — same module                          |
| Hotline evaluator              | [SPE-2628](https://linear.app/spectranoir/issue/SPE-2628) — `hotlineChannel.ts`                  |
| Hydrate wiring                 | `runTransfer.ts` — `hydrateGame`                                                                |

## Channel choice (slice 3)

| Choice                    | Rationale                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Hotline channel only**  | Mostly flat (`id` + unit intervals + boolean + two enums + non-empty string); smallest remaining envelope      |
| Deferred siblings         | Advisory (arrays + threshold) and async discussion (nested `participationWindow`) stay later SPE-956 children  |

## Scope

| In                                                                   | Out                                               |
| -------------------------------------------------------------------- | ------------------------------------------------- |
| `spe956HotlineChannelRecords` GameState map                          | Advisory / async channel maps                     |
| Extend `spe956ParticipatoryChannelPersistence.ts` sanitize/hydrate   | SPE-2620/2628/2629/2630/2631 evaluator rewrites   |
| `runTransfer` hydrate wiring + starting-state `{}`                   | Week-close tick; store actions; UI / mirror       |
| Round-trip + empty/missing normalize tests                           | SPE-1682 / SPE-860 / SPE-911 / SPE-875 expansions |
| Slice doc + SCHEMA_REGISTRY note + backlog handoff                   | Full SPE-956 parent AC                            |

## Acceptance

- [x] Empty default `{}` hydrates safely (legacy/missing saves no-op)
- [x] Invalid hotline channel entries dropped without throw
- [x] sanitize/hydrate round-trip through save/load and `hydrateGame`
- [x] Hydrated channel shape is frozen / immutable for EXAMPLE fixture
- [x] SPE-2628 evaluator contract unchanged
- [x] SPE-956 remains **Backlog**
- [x] `npm run lint` + targeted tests green

## Deferred

| Item                                              | Suggested owner | Why deferred            |
| ------------------------------------------------- | --------------- | ----------------------- |
| Advisory / async discussion channel maps          | [SPE-2635](https://linear.app/spectranoir/issue/SPE-2635) | Nested / array envelopes |
| UI / planning mirror                              | SPE-956 sibling | After persistence       |
| Week-close channel tick                           | SPE-956 sibling | Not required this slice |
| Compose/evaluate-from-GameState helpers (broader) | SPE-956 sibling | Optional read helpers   |

## Validation

- `npm.cmd run test:run -- src/test/spe956ParticipatoryChannelPersistence.test.ts`
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`

## See also

- `planning/spe-956-participatory-channel-persistence-slice-1.md`
- `planning/spe-956-participatory-channel-persistence-slice-2.md`
- `planning/spe-956-hotline-channel-slice-1.md`
- `SCHEMA_REGISTRY.md` — SPE-956 participatory channel persistence section
