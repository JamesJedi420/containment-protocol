# SPE-956 — Participatory channel persistence / store wire-up (slice 1)

One-page implementation plan. Linear: [SPE-2632](https://linear.app/spectranoir/issue/SPE-2632) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Follows shipped SPE-2620 / SPE-2628 / SPE-2629 / SPE-2630 / SPE-2631 domain evaluators and SPE-2621 sanitize/hydrate pattern. Parent stays **Backlog**.

| Field               | Value                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2632 — Participatory channel persistence / store wire-up (slice 1)](https://linear.app/spectranoir/issue/SPE-2632)          |
| **Status**          | **In Progress**                                                                                                                  |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — advisory groups / hotlines / participatory channels; stays **Backlog** |
| **Branch**          | `spe-956-participatory-channel-persistence-slice-1`                                                                              |
| **Base `main` SHA** | `b289a00f`                                                                                                                       |

## Goal

Persist the smallest already-shipped SPE-956 participatory channel envelope on GameState with sanitize/hydrate (SPE-2621 pattern) — survivor informal registry records only — without evaluator contract changes, week-close coupling, or a full UI/planning mirror.

## Prerequisite (on `main` @ `b289a00f`)

| Shipped                       | Anchor                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Survivor informal registry    | [SPE-2630](https://linear.app/spectranoir/issue/SPE-2630) — `survivorInformalRegistry.ts`       |
| Propagation graph persistence | [SPE-2621](https://linear.app/spectranoir/issue/SPE-2621) — `spe956PropagationGraphPersistence` |
| Hydrate wiring                | `runTransfer.ts` — `hydrateGame`                                                                |

## Channel choice (slice 1)

| Choice                              | Rationale                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| **Survivor informal registry only** | Fewest fields (`id` + four closed enums); clearest EXAMPLE fixture; meets “at least one” AC |
| Deferred siblings                   | Advisory / hotline / async discussion / collective memory maps stay later SPE-956 children  |

## Scope

| In                                                          | Out                                               |
| ----------------------------------------------------------- | ------------------------------------------------- |
| `spe956SurvivorInformalRegistryRecords` GameState map       | Other four participatory channel maps             |
| `spe956ParticipatoryChannelPersistence.ts` sanitize/hydrate | SPE-2620/2628/2629/2630/2631 evaluator rewrites   |
| `runTransfer` hydrate wiring + starting-state `{}`          | Week-close tick; store actions; UI / mirror       |
| Round-trip + empty/missing normalize tests                  | SPE-1682 / SPE-860 / SPE-911 / SPE-875 expansions |
| Slice doc + SCHEMA_REGISTRY note + backlog handoff          | Full SPE-956 parent AC                            |

## Acceptance

- [x] Empty default `{}` hydrates safely (legacy/missing saves no-op)
- [x] Invalid registry entries dropped without throw
- [x] sanitize/hydrate round-trip through save/load and `hydrateGame`
- [x] Hydrated registry shape is frozen / immutable for EXAMPLE fixture
- [x] SPE-2630 evaluator contract unchanged
- [x] `npm run lint` + targeted tests green

## Deferred

| Item                                              | Suggested owner | Why deferred            |
| ------------------------------------------------- | --------------- | ----------------------- |
| Advisory / hotline / async / memory channel maps  | SPE-956 sibling | One-channel boundary    |
| UI / planning mirror                              | SPE-956 sibling | After persistence       |
| Week-close channel tick                           | SPE-956 sibling | Not required this slice |
| Compose/evaluate-from-GameState helpers (broader) | SPE-956 sibling | Optional read helpers   |

## Validation

- `npm.cmd run test:run -- src/test/spe956ParticipatoryChannelPersistence.test.ts`
- `npm.cmd run lint`
- `npm.cmd run verify:backlog-handoff`

## See also

- `planning/spe-956-survivor-informal-registry-slice-1.md`
- `planning/spe-956-propagation-graph-persistence-slice-2.md`
- `SCHEMA_REGISTRY.md` — SPE-956 participatory channel persistence section
