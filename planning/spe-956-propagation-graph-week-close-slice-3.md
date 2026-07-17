# SPE-956 — Propagation graph week-close tick (slice 3)

One-page implementation plan. Linear: [SPE-2624](https://linear.app/spectranoir/issue/SPE-2624) (child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Follows shipped slice 2 ([SPE-2621](https://linear.app/spectranoir/issue/SPE-2621), PR #3143).

| Field               | Value                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2624 — Propagation graph week-close tick (slice 3)](https://linear.app/spectranoir/issue/SPE-2624)    |
| **Status**          | **In Progress**                                                                                            |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — stays **Backlog**                                |
| **Branch**          | `spe-956-propagation-graph-week-close-slice-3`                                                             |
| **Base `main` SHA** | `dc2bf497`                                                                                                 |

## Goal

Wire persisted `spe956PropagationGraphRecords` into `advanceWeek` with a pure deterministic week-close tick: apply optional authored `weeklyElapsedWeeksDelta` to `elapsedPropagationWeeks` when present, with `lastWeeklyTickWeek` idempotency ([SPE-2577](https://linear.app/spectranoir/issue/SPE-2577) pattern). No store/UI/mirror; no evaluator contract changes.

## Prerequisite (on `main` @ `dc2bf497`)

| Shipped                         | Anchor                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Pure graph compose              | [SPE-2619](https://linear.app/spectranoir/issue/SPE-2619) — `spe956PropagationGraph.ts`         |
| GameState persistence           | [SPE-2621](https://linear.app/spectranoir/issue/SPE-2621) — `spe956PropagationGraphPersistence.ts` |
| Weekly orchestration pattern    | [SPE-2577](https://linear.app/spectranoir/issue/SPE-2577) — `spe947EvaluatorWeeklyOrchestration.ts` |

## Orchestration tick contract (slice 3)

- **Optional elapsed-week delta** — when `weeklyElapsedWeeksDelta` is authored (non-negative finite), add it to `elapsedPropagationWeeks` (default 0) once per week.
- **Idempotent same-week re-tick** — `lastWeeklyTickWeek === week` is a no-op.
- **No-op** — empty map, graphs without authored delta fields; no invented graph growth.
- **Compose unchanged** — weekly fields are persistence/orchestration only; `composeSpe956PropagationGraph` semantics unchanged.

## Scope

| In                                                                 | Out                                        |
| ------------------------------------------------------------------ | ------------------------------------------ |
| Optional weekly fields on persisted graph records + sanitize       | Store / UI / mirror surfacing              |
| `applyWeeklySpe956PropagationGraphTick` domain module              | SPE-2568–2574 / SPE-2617 contract edits    |
| Call from `advanceWeek` after week increment (peer to SPE-2577)    | Pure compose API semantic changes (slice 1)|
| Focused Vitest + advanceWeek integration tests                     | Mid-week graph mutation                    |
| Slice doc + SCHEMA_REGISTRY weekly-field note + backlog handoff    | SPE-956 parent AC (advisory/hotline)       |

## Acceptance

- [x] Empty `{}` graph records map is a no-op without throw
- [x] Graphs without authored `weeklyElapsedWeeksDelta` are unchanged on week-close
- [x] Authored delta applies once per week; same-week re-tick is idempotent
- [x] sanitize/hydrate round-trip preserves weekly fields
- [x] Persistence + compose regressions green
- [x] `npm run lint` + targeted tests green

## Deferred

| Item                              | Suggested owner | Why deferred              |
| --------------------------------- | --------------- | ------------------------- |
| Store / UI / mirror surfacing     | SPE-956 sibling | After week-close wire     |
| Weekly report-note surfacing      | SPE-956 sibling | Out of slice 3 boundary   |
| SPE-956 parent AC (advisory/hotline) | SPE-956 siblings | Separate umbrella scope |

## Validation

- `npm.cmd run test:run -- src/test/spe956PropagationGraphWeeklyOrchestration.test.ts src/test/advanceWeek.spe956PropagationGraph.integration.test.ts src/test/spe956PropagationGraphPersistence.test.ts src/test/spe956PropagationGraph.test.ts`
- `npm.cmd run lint`

## See also

- `planning/spe-956-propagation-graph-persistence-slice-2.md`
- `planning/spe-947-weekly-orchestration-slice-1.md`
- `SCHEMA_REGISTRY.md` — SPE-956 propagation graph persistence section
