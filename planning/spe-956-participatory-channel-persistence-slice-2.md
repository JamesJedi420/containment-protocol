# SPE-956 — Participatory channel persistence / remaining channel maps (slice 2)

One-page implementation plan. Linear: [SPE-2633](https://linear.app/spectranoir/issue/SPE-2633) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Extends SPE-2632 sanitize/hydrate to one more already-shipped participatory channel envelope. Parent stays **Backlog**.

| Field               | Value                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2633 — Participatory channel persistence — remaining channel maps (slice 2)](https://linear.app/spectranoir/issue/SPE-2633) |
| **Status**          | **Shipped** — PR #3172                                                                                                           |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / hotlines / participatory channels; stays **Backlog** |
| **Branch**          | `spe-956-participatory-channel-persistence-slice-2`                                                                              |
| **Base `main` SHA** | `0893aec8`                                                                                                                       |

## Goal

Persist at least one additional already-shipped SPE-956 participatory channel envelope on GameState with sanitize/hydrate (SPE-2632 pattern) — collective memory-stabilization channel records — without evaluator contract changes, week-close coupling, or a full UI/planning mirror.

## Prerequisite (on `main` @ `0893aec8`)

| Shipped                       | Anchor                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Survivor informal registry map | [SPE-2632](https://linear.app/spectranoir/issue/SPE-2632) — `spe956ParticipatoryChannelPersistence.ts` |
| Collective memory evaluator   | [SPE-2631](https://linear.app/spectranoir/issue/SPE-2631) — `collectiveMemoryStabilization.ts`  |
| Hydrate wiring                | `runTransfer.ts` — `hydrateGame`                                                                |

## Channel choice (slice 2)

| Choice                              | Rationale                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Collective memory channel only**  | Flat enum envelope like survivor (`id` + four closed enums); smallest remaining map; meets “at least one” AC |
| Deferred siblings                   | Advisory / hotline / async discussion maps stay later SPE-956 children                                 |

## Scope

| In                                                                    | Out                                               |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| `spe956CollectiveMemoryChannelRecords` GameState map                  | Advisory / hotline / async channel maps           |
| Extend `spe956ParticipatoryChannelPersistence.ts` sanitize/hydrate    | SPE-2620/2628/2629/2630/2631 evaluator rewrites   |
| `runTransfer` hydrate wiring + starting-state `{}`                    | Week-close tick; store actions; UI / mirror       |
| Round-trip + empty/missing normalize tests                            | SPE-1682 / SPE-860 / SPE-911 / SPE-875 expansions |
| Slice doc + SCHEMA_REGISTRY note + backlog handoff                    | Full SPE-956 parent AC                            |

## Acceptance

- [x] Empty default `{}` hydrates safely (legacy/missing saves no-op)
- [x] Invalid collective memory channel entries dropped without throw
- [x] sanitize/hydrate round-trip through save/load and `hydrateGame`
- [x] Hydrated channel shape is frozen / immutable for EXAMPLE fixture
- [x] SPE-2631 evaluator contract unchanged
- [x] SPE-956 remains **Backlog**
- [x] `npm run lint` + targeted tests green

## Deferred

| Item                                              | Suggested owner | Why deferred            |
| ------------------------------------------------- | --------------- | ----------------------- |
| Advisory / hotline / async channel maps           | [SPE-2634](https://linear.app/spectranoir/issue/SPE-2634) | One-channel boundary    |
| UI / planning mirror                              | SPE-956 sibling | After persistence       |
| Week-close channel tick                           | SPE-956 sibling | Not required this slice |
| Compose/evaluate-from-GameState helpers (broader) | SPE-956 sibling | Optional read helpers   |

## Validation

- `npm.cmd run test:run -- src/test/spe956ParticipatoryChannelPersistence.test.ts`
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`

## See also

- `planning/spe-956-participatory-channel-persistence-slice-1.md`
- `planning/spe-956-collective-memory-stabilization-slice-1.md`
- `SCHEMA_REGISTRY.md` — SPE-956 participatory channel persistence section
