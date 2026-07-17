# SPE-2625 — Propagation graph counter overflow / zero init / deterministic ordering fix

One-page implementation plan. Linear: [SPE-2625](https://linear.app/spectranoir/issue/SPE-2625) (bugfix child under [SPE-956](https://linear.app/spectranoir/issue/SPE-956)). Follows shipped [SPE-2624](https://linear.app/spectranoir/issue/SPE-2624) week-close tick (PR #3147) and [SPE-2622](https://linear.app/spectranoir/issue/SPE-2622) hydration hardening (PR #3149).

| Field               | Value                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2625 — Fix SPE-956 weekly graph counter overflow, zero initialization, and deterministic ordering](https://linear.app/spectranoir/issue/SPE-2625) |
| **Status**          | **In Progress**                                                                                            |
| **Parent**          | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) — stays **Backlog**                                |
| **Branch**          | `spe-2625-propagation-graph-counter-overflow-fix`                                                          |
| **Base `main` SHA** | `33630c56`                                                                                                 |

## Goal

Repair five post-SPE-2624 defects in orchestration/persistence only so graph state remains persistence-safe and deterministic. No compose semantic changes, no UI, no evaluator contracts.

## Defects fixed

1. **Counter overflow** — `addNonNegativeCounters` clamps to `Number.MAX_VALUE` when finite sum would produce `Infinity`/`NaN`.
2. **Zero counter materialization** — authored zero delta on missing `elapsedPropagationWeeks` persists `0`.
3. **Code-unit sort** — graph-id iteration uses code-unit order, not `localeCompare`.
4. **Unsafe lookup defense** — `resolvePersistedPropagationGraph` rejects `__proto__` / `constructor` / `prototype`.
5. **Null-prototype regression** — direct `Object.getPrototypeOf(sanitized) === null` test coverage.

## Scope

| In                                                                 | Out                                        |
| ------------------------------------------------------------------ | ------------------------------------------ |
| `spe956PropagationGraphWeeklyOrchestration.ts` overflow + sort + zero init | `composeSpe956PropagationGraph` semantics  |
| `spe956PropagationGraphPersistence.ts` unsafe lookup defense       | Store / UI / mirror surfacing              |
| Focused Vitest + integration + save/load tests                     | SPE-2568–2574 / SPE-2617 contract edits    |
| Slice doc + optional SCHEMA_REGISTRY overflow note + backlog       | SPE-956 parent AC (advisory/hotline)       |

## Acceptance

- [ ] Large finite inputs cannot produce a non-finite persisted counter
- [ ] Save/load retains the graph after the overflow boundary case
- [ ] Missing counter plus authored zero delta produces `elapsedPropagationWeeks: 0`
- [ ] Graph iteration order is code-unit deterministic
- [ ] Direct lookup returns `null` for unsafe ids on bypassed maps
- [ ] Sanitized result maps have null prototype (direct assertion)
- [ ] Same-week re-tick remains a no-op
- [ ] Targeted tests + lint green

## Deferred

| Item                              | Suggested owner | Why deferred              |
| --------------------------------- | --------------- | ------------------------- |
| SPE-956 parent AC (advisory/hotline) | SPE-956 siblings | Separate umbrella scope |

## Validation

- `npm.cmd run test:run -- src/test/spe956PropagationGraphWeeklyOrchestration.test.ts src/test/spe956PropagationGraphPersistence.test.ts src/test/advanceWeek.spe956PropagationGraph.integration.test.ts`
- `npm.cmd run lint`

## See also

- `planning/spe-956-propagation-graph-week-close-slice-3.md`
- `SCHEMA_REGISTRY.md` — SPE-956 propagation graph persistence section
