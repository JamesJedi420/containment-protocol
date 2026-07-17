# SPE-956 — Propagation graph GameState persistence (slice 2)

One-page implementation plan. Linear: [SPE-2621](https://linear.app/spectranoir/issue/SPE-2621) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Follows shipped slice 1 ([SPE-2619](https://linear.app/spectranoir/issue/SPE-2619), PR #3140).

| Field               | Value                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2621 — Propagation graph GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2621) |
| **Status**          | **In Progress**                                                                                            |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — stays **Backlog**                                |
| **Branch**          | `spe-956-propagation-graph-persistence-slice-2`                                                            |
| **Base `main` SHA** | `cbba01d4`                                                                                                 |

## Goal

Persist authored SPE-956 propagation graphs on GameState with sanitize/hydrate (SPE-2576 pattern) and wire `composeSpe956PropagationGraph` to persisted graph + spe947* maps — without evaluator contract changes or week-close tick.

## Prerequisite (on `main` @ `cbba01d4`)

| Shipped                         | Anchor                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Pure graph compose              | [SPE-2619](https://linear.app/spectranoir/issue/SPE-2619) — `spe956PropagationGraph.ts`         |
| Evaluator persistence           | SPE-2576 — `spe947EvaluatorPersistence.ts`                                                      |
| Hydrate wiring                  | `runTransfer.ts` — `hydrateGame`                                                                |

## Scope

| In                                                                 | Out                                        |
| ------------------------------------------------------------------ | ------------------------------------------ |
| `spe956PropagationGraphRecords` GameState map                      | Week-close graph tick                      |
| `spe956PropagationGraphPersistence.ts` sanitize/hydrate            | Store / UI / mirror surfacing              |
| `runTransfer` hydrate wiring                                       | SPE-2568–2574 / SPE-2617 contract edits    |
| `composeSpe956PropagationGraphFromGameState` read helper           | Pure compose API semantic changes (slice 1)|
| Round-trip + compose-from-GameState tests                          | SPE-956 parent AC (advisory/hotline)       |
| Slice doc + SCHEMA_REGISTRY note + backlog handoff                 | Full internet simulator                    |

## Acceptance

- [ ] Empty default `{}` does not false-positive parent AC compose scenarios
- [ ] Invalid graph entries dropped safely (missing seed, bad nodes/edges, duplicates)
- [ ] sanitize/hydrate round-trip through save/load and `hydrateGame`
- [ ] `composeSpe956PropagationGraphFromGameState` matches direct compose with persisted maps
- [ ] SPE-2568–2574 / SPE-2617 contracts unchanged
- [ ] `npm run lint` + targeted tests green

## Deferred

| Item                              | Suggested owner | Why deferred              |
| --------------------------------- | --------------- | ------------------------- |
| Week-close graph tick             | SPE-956 slice 3 | Week-close boundary       |
| Store / UI / mirror surfacing     | SPE-956 sibling | After persistence         |
| SPE-956 parent AC (advisory/hotline) | SPE-956 siblings | Separate umbrella scope |

## Validation

- `npm.cmd run test:run -- src/test/spe956PropagationGraphPersistence.test.ts src/test/spe956PropagationGraph.test.ts`
- `npm.cmd run lint`

## See also

- `planning/spe-956-propagation-graph-wire-up-slice-1.md`
- `SCHEMA_REGISTRY.md` — SPE-956 propagation graph persistence section
