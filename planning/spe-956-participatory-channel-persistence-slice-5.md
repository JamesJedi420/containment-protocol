# SPE-956 — Participatory channel persistence / community advisory body map (slice 5)

One-page implementation plan. Linear: [SPE-2636](https://linear.app/spectranoir/issue/SPE-2636) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Extends SPE-2632–2635 sanitize/hydrate to the remaining already-shipped participatory channel envelope. Parent stays **Backlog**.

| Field               | Value                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2636 — Participatory channel persistence — community advisory body map (slice 5)](https://linear.app/spectranoir/issue/SPE-2636)                 |
| **Status**          | **Shipped**                                                                                                                                           |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / hotlines / participatory channels; stays **Backlog**                      |
| **Branch**          | `spe-956-participatory-channel-persistence-slice-5`                                                                                                   |
| **Base `main` SHA** | `bf4dccbe`                                                                                                                                            |

## Goal

Persist the already-shipped SPE-956 community advisory body envelope (`CommunityAdvisoryBody`) on GameState with sanitize/hydrate (SPE-2632–2635 pattern) — without evaluator contract changes, week-close coupling, or a full UI/planning mirror.

## Prerequisite (on `main` @ `bf4dccbe`)

| Shipped                        | Anchor                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Survivor informal registry map | [SPE-2632](https://linear.app/spectranoir/issue/SPE-2632) — `spe956ParticipatoryChannelPersistence.ts` |
| Collective memory channel map  | [SPE-2633](https://linear.app/spectranoir/issue/SPE-2633) — same module                                |
| Hotline channel map            | [SPE-2634](https://linear.app/spectranoir/issue/SPE-2634) — same module                                |
| Async discussion surface map   | [SPE-2635](https://linear.app/spectranoir/issue/SPE-2635) — same module                                |
| Community advisory evaluator   | [SPE-2620](https://linear.app/spectranoir/issue/SPE-2620) — `communityAdvisoryDecisionInfluence.ts`    |
| Hydrate wiring                 | `runTransfer.ts` — `hydrateGame`                                                                        |

## Channel choice (slice 5)

| Choice                         | Rationale                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Community advisory body**    | Remaining deferred envelope: string arrays + `authorizedDecisionScopes` enums + `influenceThreshold`           |
| Already persisted siblings     | Survivor registry, collective memory, hotline, async discussion surface                                        |

## Scope

| In                                                                   | Out                                               |
| -------------------------------------------------------------------- | ------------------------------------------------- |
| `spe956CommunityAdvisoryBodyRecords` GameState map                   | SPE-2620 evaluator rewrite                        |
| Extend `spe956ParticipatoryChannelPersistence.ts` sanitize/hydrate   | UI / planning mirror; week-close channel tick     |
| `runTransfer` hydrate wiring + starting-state `{}`                   | SPE-1682 / SPE-860 / SPE-911 / SPE-875 expansions |
| Round-trip + empty/missing normalize tests                           | Full SPE-956 parent AC                            |
| Slice doc + SCHEMA_REGISTRY note + backlog handoff                   |                                                   |

## Acceptance

- [x] Empty default `{}` hydrates safely (legacy/missing saves no-op)
- [x] Invalid advisory body entries dropped without throw (bad enum/array/threshold/strings)
- [x] sanitize/hydrate round-trip through save/load and `hydrateGame`
- [x] Hydrated channel shape is frozen / immutable for EXAMPLE fixture (incl. nested arrays)
- [x] SPE-2620 evaluator contract unchanged
- [x] SPE-956 remains **Backlog**
- [x] `npm run lint` + targeted tests green

## Deferred

| Item                                              | Suggested owner | Why deferred            |
| ------------------------------------------------- | --------------- | ----------------------- |
| UI / planning mirror                              | [SPE-2637](https://linear.app/spectranoir/issue/SPE-2637) | After persistence — primary handoff |
| Week-close channel tick                           | SPE-956 sibling | Not required this slice |
| Compose/evaluate-from-GameState helpers (broader) | SPE-956 sibling | Optional read helpers   |

## Validation

- `npm.cmd run test:run -- src/test/spe956ParticipatoryChannelPersistence.test.ts`
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`

## See also

- `planning/spe-956-participatory-channel-persistence-slice-1.md`
- `planning/spe-956-participatory-channel-persistence-slice-2.md`
- `planning/spe-956-participatory-channel-persistence-slice-3.md`
- `planning/spe-956-participatory-channel-persistence-slice-4.md`
- `planning/spe-956-community-advisory-decision-influence-slice-1.md`
- `SCHEMA_REGISTRY.md` — SPE-956 participatory channel persistence section
